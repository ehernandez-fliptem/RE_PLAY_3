import { z } from "zod";
import dotenv from "dotenv";

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
    CONFIG = envSchema.parse(process.env);
} catch (error) {
    console.error("❌ Error en configuración de variables de entorno:");
    console.error(error);
    process.exit(1);
}

export { CONFIG }
