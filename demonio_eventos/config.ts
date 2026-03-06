import { z } from "zod";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envRootPath = path.resolve(__dirname, "..", "..", ".env");
const envLocalPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envRootPath)) {
    dotenv.config({ path: envRootPath });
}
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
}
dotenv.config();

const envSchema = z.object({
    URL_SERVER: z.string().url(),
    URL_HYUNDAI: z.string().url(),

    SECRET_TOKEN_SOCKET: z.string(),
    SECRET_CRYPTO: z.string(),
    SECRET_HYUNDAI: z.string(),
});
let CONFIG: z.infer<typeof envSchema>;

try {
    const host = process.env.REPLAY_BACK_HOST ?? "localhost";
    const port = process.env.REPLAY_BACK_PORT;
    const fallbackUrlServer = port ? `http://${host}:${port}` : `http://${host}`;
    const rawEnv = {
        ...process.env,
        URL_SERVER: process.env.URL_SERVER ?? fallbackUrlServer,
    };
    CONFIG = envSchema.parse(rawEnv);
} catch (error) {
    console.error("❌ Error en configuración de variables de entorno:");
    console.error(error);
    process.exit(1);
}

export { CONFIG }
