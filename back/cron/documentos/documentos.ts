import Documentos from "../../models/Documentos";
import { log, fecha } from "../../middlewares/log";

export async function validarDocumentacionPorExpirar(): Promise<void> {
    try {
        await Documentos.updateMany({
            estatus: 3,
            activo: true,
            tiempo_indefinido: false,
            fecha_salida: { $lte: new Date() },
        }, {
            $set: {
                activo: false
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR-DOC-EXP ❌: ${error.name} ${error.message}\n\n`);
        throw error;
    }
}