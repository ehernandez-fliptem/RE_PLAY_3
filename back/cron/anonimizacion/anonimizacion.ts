import dayjs from "dayjs";
import Empleados from "../../models/Empleados";
import Usuarios from "../../models/Usuarios";
import Visitantes from "../../models/Visitantes";

const DIAS_RETENCION_ELIMINADOS = 30;

const queryEliminadosVencidos = (fechaLimite: Date) => ({
    eliminado_permanente: true,
    arco: { $ne: true },
    $or: [
        { fecha_eliminacion_permanente: { $lte: fechaLimite } },
        {
            fecha_eliminacion_permanente: { $in: [null, undefined] },
            fecha_modificacion: { $lte: fechaLimite },
        },
    ],
});

const correoAnonimizado = (tipo: string, id: unknown): string =>
    `anonimizado.${tipo}.${String(id)}@local.invalid`.toLowerCase();

async function anonimizarEmpleados(fechaLimite: Date): Promise<number> {
    const registros = await Empleados.find(queryEliminadosVencidos(fechaLimite), "_id").lean();
    let total = 0;

    for (const registro of registros) {
        const ahora = new Date();
        const result = await Empleados.updateOne(
            { _id: registro._id, eliminado_permanente: true, arco: { $ne: true } },
            {
                $set: {
                    nombre: "Anonimizado",
                    apellido_pat: "Eliminado",
                    apellido_mat: "",
                    correo: correoAnonimizado("empleado", registro._id),
                    img_usuario: "",
                    movil: "",
                    telefono: "",
                    extension: "",
                    huellas_registradas: [],
                    huellas_hiki_registradas: [],
                    huellas_biostar_registradas: [],
                    huellas_template_dev: {},
                    tarjetas_registradas: [],
                    tarjetas_web: [],
                    token_web: "",
                    token_app: "",
                    token_bloqueo: "",
                    biostar_user_id: "",
                    biostar_group_id: "",
                    biostar_group_name: "",
                    sync_hikvision_error: "",
                    sync_biostar_error: "",
                    arco: true,
                    activo: false,
                    fecha_anonimizacion: ahora,
                    fecha_modificacion: ahora,
                },
            }
        );
        total += result.modifiedCount || 0;
    }

    return total;
}

async function anonimizarUsuarios(fechaLimite: Date): Promise<number> {
    const registros = await Usuarios.find(queryEliminadosVencidos(fechaLimite), "_id").lean();
    let total = 0;

    for (const registro of registros) {
        const ahora = new Date();
        const result = await Usuarios.updateOne(
            { _id: registro._id, eliminado_permanente: true, arco: { $ne: true } },
            {
                $set: {
                    nombre: "Anonimizado",
                    apellido_pat: "Eliminado",
                    apellido_mat: "",
                    correo: correoAnonimizado("usuario", registro._id),
                    img_usuario: "",
                    movil: "",
                    telefono: "",
                    extension: "",
                    token_web: "",
                    token_app: "",
                    token_bloqueo: "",
                    id_empleado_vinculado: null,
                    arco: true,
                    activo: false,
                    fecha_anonimizacion: ahora,
                    fecha_modificacion: ahora,
                },
            }
        );
        total += result.modifiedCount || 0;
    }

    return total;
}

async function anonimizarVisitantes(fechaLimite: Date): Promise<number> {
    const registros = await Visitantes.find(queryEliminadosVencidos(fechaLimite), "_id").lean();
    let total = 0;

    for (const registro of registros) {
        const ahora = new Date();
        const result = await Visitantes.updateOne(
            { _id: registro._id, eliminado_permanente: true, arco: { $ne: true } },
            {
                $set: {
                    nombre: "Anonimizado",
                    apellido_pat: "Eliminado",
                    apellido_mat: "",
                    correo: correoAnonimizado("visitante", registro._id),
                    telefono: "",
                    empresa: "",
                    img_usuario: "",
                    img_ine: "",
                    archivo_licencia: "",
                    archivo_poliza_seguro: "",
                    archivo_tarjeta_circulacion: "",
                    card_code: "",
                    token_web: "",
                    token_app: "",
                    token_bloqueo: "",
                    acceso_qr_estado: "cerrado",
                    acceso_qr_modo: "",
                    acceso_qr_expira: null,
                    acceso_qr_autorizado_por: null,
                    acceso_qr_motivo: "",
                    acceso_qr_ocr_texto: "",
                    desbloqueado_hasta: null,
                    arco: true,
                    activo: false,
                    fecha_anonimizacion: ahora,
                    fecha_modificacion: ahora,
                },
            }
        );
        total += result.modifiedCount || 0;
    }

    return total;
}

export async function anonimizarEliminadosVencidos(): Promise<void> {
    const fechaLimite = dayjs().subtract(DIAS_RETENCION_ELIMINADOS, "day").toDate();

    const [empleados, usuarios, visitantes] = await Promise.all([
        anonimizarEmpleados(fechaLimite),
        anonimizarUsuarios(fechaLimite),
        anonimizarVisitantes(fechaLimite),
    ]);

    const total = empleados + usuarios + visitantes;
    if (total > 0) {
        console.log(`[ANONIMIZACION] Registros anonimizados: empleados=${empleados}, usuarios=${usuarios}, visitantes=${visitantes}`);
    }
}
