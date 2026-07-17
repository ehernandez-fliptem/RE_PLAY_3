/**
 * Extrae la plantilla de huella de un empleado desde BioStar.
 *
 * Sirve para el PASO 5 del auto-diagnostico del agente: es la plantilla que se
 * pega en la pagina del agente para comprobar si BioStar y el BioMini hablan el
 * mismo idioma. Esa es la unica pregunta del proyecto que no se puede responder
 * leyendo codigo.
 *
 * Uso (desde back/):
 *   npx ts-node scripts/plantilla-biostar.ts <id_empleado>
 *
 * Ejemplo:
 *   npx ts-node scripts/plantilla-biostar.ts 1234
 *
 * La plantilla que imprime es un dato biometrico: usala para la prueba y no la
 * dejes en un chat, un ticket ni un archivo.
 */
import mongoose from "mongoose";
import { CONFIG } from "../config";
import Empleados from "../models/Empleados";
import DispositivosBiostar from "../models/DispositivosBiostar";
import BiostarConexion from "../models/BiostarConexion";
import { biostarRequest } from "../classes/Biostar";

async function conexionActiva(): Promise<any | null> {
    const main = await DispositivosBiostar.findOne({ activo: true, es_main: true }).sort({ _id: -1 });
    if (main) return main;
    const activa = await DispositivosBiostar.findOne({ activo: true }).sort({ _id: -1 });
    if (activa) return activa;
    return BiostarConexion.findOne({ activo: true }).sort({ _id: -1 });
}

async function main() {
    const arg = String(process.argv[2] || "").trim();
    if (!arg) {
        console.error("Falta el id del empleado.\n  npx ts-node scripts/plantilla-biostar.ts <id_empleado>");
        process.exit(1);
    }

    await mongoose.connect(CONFIG.MONGODB_URI);

    const empleado = await Empleados.findOne(
        { $or: [{ id_empleado: Number(arg) }, { id_general: Number(arg) }] } as any,
        "nombre apellido_pat biostar_user_id huellas_biostar_registradas"
    ).lean<any>();

    if (!empleado) {
        console.error(`No se encontro el empleado ${arg}.`);
        process.exit(1);
    }

    const nombre = `${empleado.nombre || ""} ${empleado.apellido_pat || ""}`.trim();
    console.log(`Empleado: ${nombre}`);
    console.log(`Dedos enrolados en BioStar: ${JSON.stringify(empleado.huellas_biostar_registradas || [])}`);

    if (!empleado.biostar_user_id) {
        console.error("\nEste empleado no tiene usuario en BioStar, asi que no tiene huella que extraer.");
        console.error("Enrola primero su huella desde el modulo de Empleados.");
        process.exit(1);
    }

    const conexion = await conexionActiva();
    if (!conexion) {
        console.error("\nNo hay ninguna conexion activa a BioStar configurada.");
        process.exit(1);
    }

    const detalle = await biostarRequest(conexion, {
        method: "GET",
        url: `/api/users/${encodeURIComponent(String(empleado.biostar_user_id))}`,
    });
    if (!detalle.ok) {
        console.error(`\nBioStar no respondio: ${detalle.message || detalle.status}`);
        process.exit(1);
    }

    const templates = detalle.data?.User?.fingerprint_templates || [];
    if (!templates.length) {
        console.error("\nBioStar no tiene plantillas para este usuario.");
        console.error("Aparece enrolado en RE_PLAY pero no en BioStar: vuelve a enrolar la huella.");
        process.exit(1);
    }

    console.log(`\n${templates.length} plantilla(s) en BioStar.\n`);
    templates.forEach((t: any, i: number) => {
        const dedoBiostar = Number(t?.finger_index ?? 0);
        console.log(`--- Plantilla ${i + 1} | dedo ${dedoBiostar + 1} (finger_index ${dedoBiostar}) ---`);
        console.log(t?.template0 || "(vacia)");
        console.log("");
    });

    console.log("Pega CUALQUIERA de las de arriba en el paso 5 del agente,");
    console.log(`y que ${nombre || "la persona"} ponga ESE MISMO dedo en el BioMini.`);

    await mongoose.disconnect();
}

main().catch(async (e) => {
    console.error(e?.message || e);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
