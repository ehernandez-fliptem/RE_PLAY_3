import { log, fecha } from './middlewares/log';
import { main } from './supervisor';

(async () => {
    try {
        await main();
    } catch (error: any) {
        log(`${fecha()} ERROR-SERVER: ${error.name}: ${error.message}\n`);
    }
})()