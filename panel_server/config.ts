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
    PUERTO_HTTP: z.coerce.number(),
    SECRET_HYUNDAI: z.string(),
});
let CONFIG: z.infer<typeof envSchema>;

try {
    const rawEnv = {
        ...process.env,
        PUERTO_HTTP: process.env.REPLAY_PANEL_PORT ?? process.env.PUERTO_HTTP,
    };
    CONFIG = envSchema.parse(rawEnv);
} catch (error) {
    console.error("❌ Error en configuración de variables de entorno:");
    console.error(error);
    process.exit(1);
}

export { CONFIG }
