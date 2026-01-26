import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    MONGODB_URI: z.string(),
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
