import cron from "node-cron";
import { finalizarVencidos } from "./registros/registros";
import { validarDocumentacionPorExpirar } from "./documentos/documentos";

// Se ejecuta cada 20 segundos
cron.schedule('*/20 * * * * *', async () => {
    await finalizarVencidos();
});

// Se ejecuta cada día a media noche
cron.schedule('0 0 * * *', async () => {
    await validarDocumentacionPorExpirar();
});