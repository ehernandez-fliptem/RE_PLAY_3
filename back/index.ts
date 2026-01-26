import { connectDB } from './connection';
import Server from './server';
import { log, fecha } from './middlewares/log';

(async () => {
    try {
        await connectDB();
        await Server();
    } catch (error: any) {
        log(`${fecha()} ERROR-SERVER: ${error.name}: ${error.message}\n`);
    }
})()