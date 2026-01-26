import { StringValue } from 'ms';
export {};

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            URL_HYUNDAI: string;
            PUERTO_HTTP: string;
            PUERTO_HTTPS: string;
            MONGODB_URI: string;
            SECRET_HYUNDAI: string;
            SECRET: string;
            SECRET_EMAIL: string;
            SECRET_CRYPTO: string;
            SECRET_TOKEN_SOCKET: string;
            SECRET_EXCELJS: string;
            LIFE_TIME: StringValue | undefined;
            LIFE_TIME_EMAIL: StringValue | undefined;
            LIFE_TIME_RESTRICTED: StringValue | undefined;
            MAIL_USER: string;
            MAIL_PASS: string;
        }
    }
}