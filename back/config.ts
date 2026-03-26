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

type LocalConfig = {
    httpPort?: number;
    httpsPort?: number;
    openBrowser?: boolean;
};

function loadLocalConfig(): LocalConfig {
    try {
        const configPath = path.resolve(__dirname, "..", "..", "config", "config.json");
        if (!fs.existsSync(configPath)) return {};
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);
        return {
            httpPort: typeof parsed.httpPort === "number" ? parsed.httpPort : undefined,
            httpsPort: typeof parsed.httpsPort === "number" ? parsed.httpsPort : undefined,
            openBrowser: typeof parsed.openBrowser === "boolean" ? parsed.openBrowser : undefined,
        };
    } catch {
        return {};
    }
}

const localConfig = loadLocalConfig();

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
    const rawEnv = {
        ...process.env,
        PUERTO_HTTP: localConfig.httpPort ?? process.env.REPLAY_BACK_PORT ?? process.env.PUERTO_HTTP,
        PUERTO_HTTPS: localConfig.httpsPort ?? process.env.REPLAY_BACK_HTTPS_PORT ?? process.env.PUERTO_HTTPS,
    };
    CONFIG = envSchema.parse(rawEnv);
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
