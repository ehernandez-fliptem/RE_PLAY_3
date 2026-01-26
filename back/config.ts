import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.string(),
    ENDPOINT: z.string().url(),
    URL_HYUNDAI: z.string().url(),
    PUERTO_HTTP: z.coerce.number(),
    PUERTO_HTTPS: z.coerce.number(),
    MONGODB_URI: z.string(),

    SECRET_HYUNDAI: z.string(),
    SECRET: z.string(),
    SECRET_EMAIL: z.string(),
    SECRET_CRYPTO: z.string(),
    SECRET_TOKEN_SOCKET: z.string(),
    SECRET_EXCELJS: z.string(),

    LIFE_TIME: z.string(),
    LIFE_TIME_EMAIL: z.string(),
    LIFE_TIME_RESTRICTED: z.string(),

    MAIL_USER: z.string().email(),
    MAIL_PASS: z.string(),
    
});
let CONFIG: z.infer<typeof envSchema>;

try {
    CONFIG = envSchema.parse(process.env);
} catch (error) {
    console.error("❌ Error en configuración de variables de entorno:");
    if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
            console.error(`   - ${err.path.join(".")}: ${err.message}`);
        });
    } else {
        console.error(error);
    }
    process.exit(1);
}

export { CONFIG }
