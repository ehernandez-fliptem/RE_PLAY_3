import cron from "node-cron";
import { finalizarVencidos } from "./registros/registros";
import { validarDocumentacionPorExpirar } from "./documentos/documentos";
import { recalibrarRelojPaneles } from "./paneles/reloj";
import { sincronizarEventosBiostar } from "./biostar/eventos";

// Se ejecuta cada 20 segundos
cron.schedule('*/20 * * * * *', async () => {
    await finalizarVencidos();
});

// Se ejecuta cada día a media noche
cron.schedule('0 0 * * *', async () => {
    await validarDocumentacionPorExpirar();
});

// Recalibración diaria de reloj por panel (offset y alertas)
cron.schedule("15 0 * * *", async () => {
    await recalibrarRelojPaneles();
});

// Sincronizacion de eventos BioStar hacia RE (kiosco/reportes) cada 5s
cron.schedule("*/5 * * * * *", async () => {
    await sincronizarEventosBiostar();
});
