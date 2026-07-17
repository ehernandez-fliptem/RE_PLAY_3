import { Request, Response } from "express";
import { Types } from "mongoose";
import Configuracion from "../models/Configuracion";
import Empleados from "../models/Empleados";
import DispositivosBiostar from "../models/DispositivosBiostar";
import BiostarConexion from "../models/BiostarConexion";
import { biostarRequest } from "../classes/Biostar";
import { fecha, log } from "../middlewares/log";
import { UserRequest } from "../types/express";
import { CONFIG } from "../config";
import {
    agenteSecretoConfigurado,
    generarTokenAgente,
    cifrarPaquetePlantillas,
    cifrarPlantillaEnReposo,
    descifrarPlantillaEnReposo,
    PlantillaAgente,
} from "../utils/agenteBiometrico";

/**
 * Soporte para el Agente Biometrico local (BioMini Slim 2 en caseta).
 *
 * Reparto de responsabilidades:
 *   - El agente hace el 1:N, porque el matcher de Suprema es una DLL nativa de
 *     Windows y meterla en Node exigiria bindings nativos.
 *   - Para hacerlo necesita plantillas. El backend se las manda cifradas y el
 *     navegador solo las transporta: nunca ve una huella en claro.
 *   - Solo van las plantillas de los empleados autorizados EN ESE acceso. Si se
 *     roban la PC de caseta, no se llevan el padron completo.
 */

async function getBiostarConexionActiva(): Promise<any | null> {
    const main = await DispositivosBiostar.findOne({ activo: true, es_main: true })
        .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (main) return main;
    const activa = await DispositivosBiostar.findOne({ activo: true })
        .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (activa) return activa;
    return BiostarConexion.findOne({ activo: true })
        .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
}

/**
 * Datos que la pantalla de caseta necesita para hablar con el agente.
 * El token dura pocos minutos; la web lo renueva.
 */
export async function obtenerTokenAgente(req: Request, res: Response): Promise<void> {
    try {
        const id_acceso = (req as UserRequest).accessId;

        if (!agenteSecretoConfigurado()) {
            res.status(200).json({
                estado: false,
                mensaje: "El lector de huella no esta configurado en este servidor.",
                detalle: "Falta AGENTE_BIOMETRICO_SECRET en el .env del backend.",
            });
            return;
        }
        if (!id_acceso) {
            res.status(200).json({ estado: false, mensaje: "Tu usuario no tiene un acceso asignado." });
            return;
        }

        const { token, expira } = generarTokenAgente(String(id_acceso));
        res.status(200).json({
            estado: true,
            datos: { token, expira, puerto: CONFIG.AGENTE_BIOMETRICO_PORT },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

/**
 * Lee las plantillas de un empleado desde BioStar y las cachea cifradas.
 *
 * BioStar guarda 2 muestras por dedo (template0/template1) y es la fuente de
 * verdad. El cache existe porque el 1:N necesita las plantillas en cada lectura
 * y no vamos a pegarle a BioStar 100 veces por persona que llega a la caseta.
 */
async function backfillPlantillasDesdeBiostar(empleado: any): Promise<Record<string, string> | null> {
    const bioUserId = String(empleado?.biostar_user_id || "").trim();
    if (!bioUserId) return null;

    const conexion = await getBiostarConexionActiva();
    if (!conexion) return null;

    const detalle = await biostarRequest(conexion, {
        method: "GET",
        url: `/api/users/${encodeURIComponent(bioUserId)}`,
    });
    if (!detalle.ok) return null;

    const templates = Array.isArray(detalle.data?.User?.fingerprint_templates)
        ? detalle.data.User.fingerprint_templates
        : [];
    if (!templates.length) return null;

    // BioStar guarda varias muestras por dedo (el enrolamiento manda 2), cada una
    // con template0 y template1, y indexa los dedos desde 0; RE_PLAY desde 1.
    const muestrasPorDedo = new Map<string, Array<{ t0: string; t1: string }>>();
    for (const t of templates) {
        const idx = Number(t?.finger_index ?? t?.fingerIndex);
        if (!Number.isFinite(idx)) continue;
        const t0 = String(t?.template0 || "");
        const t1 = String(t?.template1 || "");
        if (!t0 && !t1) continue;
        const dedo = String(idx + 1);
        const lista = muestrasPorDedo.get(dedo) ?? [];
        lista.push({ t0, t1 });
        muestrasPorDedo.set(dedo, lista);
    }
    if (!muestrasPorDedo.size) return null;

    const porDedo: Record<string, string> = {};
    for (const [dedo, muestras] of muestrasPorDedo) {
        porDedo[dedo] = cifrarPlantillaEnReposo(JSON.stringify(muestras));
    }

    await Empleados.updateOne(
        { _id: empleado._id },
        { $set: { huellas_template_biostar: porDedo, fecha_modificacion: Date.now() } }
    );
    return porDedo;
}

/**
 * Paquete cifrado de plantillas para el acceso donde esta la caseta.
 * La web lo recibe opaco y se lo pasa tal cual al agente.
 */
export async function obtenerPlantillasAgente(req: Request, res: Response): Promise<void> {
    try {
        const id_acceso = (req as UserRequest).accessId;

        if (!agenteSecretoConfigurado()) {
            res.status(200).json({
                estado: false,
                mensaje: "El lector de huella no esta configurado en este servidor.",
                detalle: "Falta AGENTE_BIOMETRICO_SECRET en el .env del backend.",
            });
            return;
        }
        const configBio = await Configuracion.findOne({}, "habilitarIntegracionBiostar");
        if (!configBio?.habilitarIntegracionBiostar) {
            res.status(200).json({ estado: false, mensaje: "La integracion de BioStar esta desactivada." });
            return;
        }
        if (!id_acceso) {
            res.status(200).json({ estado: false, mensaje: "Tu usuario no tiene un acceso asignado." });
            return;
        }

        const empleados = await Empleados.find(
            {
                activo: true,
                accesos: new Types.ObjectId(String(id_acceso)),
                huellas_biostar_registradas: { $exists: true, $ne: [] },
            },
            "_id biostar_user_id huellas_biostar_registradas huellas_template_biostar"
        ).lean<any[]>();

        const items: PlantillaAgente[] = [];
        let recuperados = 0;
        let sinPlantilla = 0;

        for (const empleado of empleados) {
            let cache: Record<string, string> | null =
                empleado.huellas_template_biostar && Object.keys(empleado.huellas_template_biostar).length
                    ? empleado.huellas_template_biostar
                    : null;

            // Los empleados enrolados antes de que existiera este cache solo tienen
            // la plantilla en BioStar: se trae una vez y queda cacheada.
            if (!cache) {
                cache = await backfillPlantillasDesdeBiostar(empleado);
                if (cache) recuperados++;
            }
            if (!cache) {
                sinPlantilla++;
                continue;
            }

            for (const [dedo, cifrado] of Object.entries(cache)) {
                try {
                    const muestras = JSON.parse(descifrarPlantillaEnReposo(String(cifrado))) as Array<{ t0: string; t1: string }>;
                    // Cada muestra del dedo entra como candidato independiente: que
                    // cualquiera haga match basta para identificar a la persona.
                    for (const muestra of muestras) {
                        for (const template of [muestra?.t0, muestra?.t1]) {
                            if (template) items.push({ personId: String(empleado._id), finger: Number(dedo), template });
                        }
                    }
                } catch {
                    // Una plantilla ilegible (cambio de SECRET_CRYPTO, dato corrupto)
                    // no debe dejar sin servicio a toda la caseta.
                    sinPlantilla++;
                }
            }
        }

        res.status(200).json({
            estado: true,
            datos: {
                bundle: cifrarPaquetePlantillas(String(id_acceso), items),
                total_plantillas: items.length,
                total_empleados: empleados.length,
                recuperados_de_biostar: recuperados,
                sin_plantilla: sinPlantilla,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
