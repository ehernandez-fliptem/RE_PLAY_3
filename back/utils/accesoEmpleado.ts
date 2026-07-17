import { Types } from "mongoose";
import Eventos from "../models/Eventos";
import { abrirPuertaPorAccesoBiostar } from "./biostarApertura";
import { guardarEventoNoValido } from "./utils";
import { socket } from "./socketClient";

/**
 * Autorizacion de acceso de un empleado, independiente de como se le identifico.
 *
 * Existe para que la huella no duplique las reglas del QR. El flujo es:
 *
 *   QR o huella  ->  identidad encontrada  ->  ESTE SERVICIO  ->  evento + apertura
 *
 * Quien llama resuelve la identidad (regex + lookup para QR, 1:N del agente para
 * huella) y entrega el empleado ya cargado. De aqui en adelante las reglas son
 * las mismas para los dos, por construccion y no por disciplina.
 *
 * Extraido de validarQr en eventos.controller.ts. Los mensajes son literales del
 * original: cambiarlos aqui los cambia tambien para el QR.
 */

/** tipos_dispositivos: 2 = QR, 5 = Huella. Ver connection.ts. */
const TIPO_DISPOSITIVO = { qr: 2, huella: 5 } as const;

export type MetodoIdentificacion = keyof typeof TIPO_DISPOSITIVO;

export type ResultadoAcceso = {
    estado: boolean;
    mensaje?: string;
    datos?: {
        puedeAcceder: boolean;
        nombre: string;
        tipo_check?: number;
        advertencia_apertura?: string;
        biostar_modo_manual?: boolean;
    };
};

export type ParamsAccesoEmpleado = {
    /** Empleado ya identificado, con al menos: _id, activo, accesos, nombre, apellido_pat, apellido_mat. */
    empleado: any;
    /** Acceso donde esta parada la tablet/caseta (x-access-default-entrance). */
    id_acceso?: string | null;
    /** Usuario tablet que origina el evento; queda como creado_por. */
    id_usuario: Types.ObjectId | string;
    /** Decide entrada(5)/salida(6). Lo define el llamador segun modo_tablet_qr. */
    resolverTipoEvento: (ultimo?: number | null) => number;
    biostarModoManual: boolean;
    metodo: MetodoIdentificacion;
    /** Solo para QR: el codigo leido, que se guarda en el evento. */
    qr?: string;
};

export async function procesarAccesoEmpleado(params: ParamsAccesoEmpleado): Promise<ResultadoAcceso> {
    const { empleado, id_acceso, id_usuario, resolverTipoEvento, biostarModoManual, metodo } = params;
    const tipoDispositivo = TIPO_DISPOSITIVO[metodo];
    const qr = metodo === "qr" ? String(params.qr ?? "") : "";

    const rechazar = async (comentario: string): Promise<ResultadoAcceso> => {
        await guardarEventoNoValido("", "", comentario, id_usuario, qr, null, null, empleado?._id ?? null, tipoDispositivo);
        return { estado: false, mensaje: comentario };
    };

    if (!empleado.activo) {
        return rechazar("El empleado ya no esta disponible.");
    }

    if (!id_acceso) {
        return rechazar("Tu usuario no tiene acceso asociado para validar apertura.");
    }

    const accesosEmpleado = Array.isArray(empleado.accesos) ? empleado.accesos : [];
    const puedeAbrirEnEsteAcceso = accesosEmpleado.some((item: any) => String(item) === String(id_acceso));
    if (!puedeAbrirEnEsteAcceso) {
        return rechazar("El empleado no tiene permiso para este acceso.");
    }

    // Antipassback: alterna contra el ultimo evento DE ESTE ACCESO. Una tablet de
    // entrada y otra de salida llevan cuentas separadas.
    const ultimo = await Eventos.findOne({
        id_empleado: empleado._id,
        id_acceso,
        tipo_check: { $in: [5, 6] },
    })
        .sort({ fecha_creacion: -1 })
        .lean<{ tipo_check?: number }>();

    const tipo_evento = resolverTipoEvento(ultimo?.tipo_check);

    const evento = new Eventos({
        tipo_dispositivo: tipoDispositivo,
        tipo_check: tipo_evento,
        qr,
        id_empleado: empleado._id,
        id_acceso,
        creado_por: id_usuario,
        // Deja constancia de que la validacion la hizo el BioMini y la apertura la
        // ordeno esta app, no una terminal de BioStar. En QR el campo se omite,
        // igual que antes de extraer este servicio.
        ...(metodo === "huella"
            ? { comentario: "Acceso por huella (BioMini en caseta). Apertura ordenada por RE_PLAY." }
            : {}),
        fecha_creacion: Date.now(),
    });
    await evento.save();

    let aperturaError = "";
    if (tipo_evento === 5) {
        const openRes = await abrirPuertaPorAccesoBiostar({
            idAcceso: id_acceso,
            idPersona: empleado._id,
            tipoPersona: "empleado",
            origen: "hiki_evento",
        });
        if (!openRes.ok && !openRes.skipped) {
            aperturaError = openRes.message || "Error desconocido.";
        }
    }

    socket.emit("eventos:nuevo-evento", { id_evento: evento._id });

    const nombre = `${empleado.nombre || ""} ${empleado.apellido_pat || ""} ${empleado.apellido_mat || ""}`.trim();
    return {
        estado: true,
        datos: {
            puedeAcceder: true,
            nombre,
            tipo_check: tipo_evento,
            advertencia_apertura: aperturaError || undefined,
            biostar_modo_manual: biostarModoManual,
        },
    };
}
