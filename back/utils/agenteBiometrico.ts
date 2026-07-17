import crypto from "crypto";
import { CONFIG } from "../config";

/**
 * Cripto compartida con el Agente Biometrico local (.NET).
 *
 * El espejo de este archivo es:
 *   agente_biometrico/src/SupremaAgent/Security/AgentCrypto.cs
 * Cualquier cambio de formato aqui rompe al agente en silencio hasta que alguien
 * pone un dedo en caseta. Si tocas esto, toca los dos lados juntos.
 *
 * No se reutiliza encryptPassword/decryptPassword (crypto-js) a proposito: usan
 * el KDF legacy de OpenSSL (EVP_BytesToKey con MD5) y no autentican el mensaje.
 * Para plantillas biometricas usamos AES-256-GCM con PBKDF2, que ademas detecta
 * manipulacion del paquete.
 */

const SALT_SIZE = 16;
const IV_SIZE = 12;
const TAG_SIZE = 16;
const KEY_SIZE = 32;
const ITERATIONS = 100_000;

/** Vigencia del token que la web le presenta al agente. */
const TOKEN_TTL_SECONDS = 5 * 60;

export function agenteSecretoConfigurado(): boolean {
    return !!String(CONFIG.AGENTE_BIOMETRICO_SECRET || "").trim();
}

function secreto(): string {
    const value = String(CONFIG.AGENTE_BIOMETRICO_SECRET || "").trim();
    if (!value) {
        throw new Error(
            "AGENTE_BIOMETRICO_SECRET no esta configurado en el .env del backend. " +
            "El agente biometrico no puede autenticarse ni recibir plantillas sin el."
        );
    }
    return value;
}

function derivarLlave(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(secreto(), salt, ITERATIONS, KEY_SIZE, "sha256");
}

export type PlantillaAgente = {
    personId: string;
    finger: number;
    template: string;
};

/**
 * Cifra el paquete de plantillas que viaja hacia el agente.
 *
 * El navegador solo lo transporta: nunca ve una huella en claro, aunque el
 * paquete pase por su memoria. Formato: base64( salt | iv | tag | ciphertext ).
 */
export function cifrarPaquetePlantillas(acceso: string, items: PlantillaAgente[]): string {
    const salt = crypto.randomBytes(SALT_SIZE);
    const iv = crypto.randomBytes(IV_SIZE);
    const key = derivarLlave(salt);

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_SIZE });
    const plain = Buffer.from(JSON.stringify({ acceso, items }), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();

    plain.fill(0);
    key.fill(0);

    return Buffer.concat([salt, iv, tag, ciphertext]).toString("base64");
}

/**
 * Cifrado en reposo de las plantillas cacheadas en Mongo
 * (Empleados.huellas_template_biostar).
 *
 * Llave distinta a la del agente: usa SECRET_CRYPTO, que ya protege las
 * credenciales de BioStar. Asi, el secreto que se distribuye a cada caseta no
 * abre la base de datos si se filtra.
 */
export function cifrarPlantillaEnReposo(valor: string): string {
    const salt = crypto.randomBytes(SALT_SIZE);
    const iv = crypto.randomBytes(IV_SIZE);
    const key = crypto.pbkdf2Sync(String(CONFIG.SECRET_CRYPTO), salt, ITERATIONS, KEY_SIZE, "sha256");
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_SIZE });
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(valor, "utf8")), cipher.final()]);
    key.fill(0);
    return Buffer.concat([salt, iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function descifrarPlantillaEnReposo(valor: string): string {
    const raw = Buffer.from(valor, "base64");
    const salt = raw.subarray(0, SALT_SIZE);
    const iv = raw.subarray(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const tag = raw.subarray(SALT_SIZE + IV_SIZE, SALT_SIZE + IV_SIZE + TAG_SIZE);
    const ciphertext = raw.subarray(SALT_SIZE + IV_SIZE + TAG_SIZE);
    const key = crypto.pbkdf2Sync(String(CONFIG.SECRET_CRYPTO), salt, ITERATIONS, KEY_SIZE, "sha256");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_SIZE });
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    key.fill(0);
    return plain;
}

function base64Url(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Token de corta vida para que la web se identifique ante el agente.
 * Formato: base64url(payload) "." base64url(HMAC-SHA256(secreto, payload)).
 *
 * Se firma con HMAC y no con JWT porque el agente solo necesita verificar una
 * firma; meterle una libreria de JWT a un .NET que corre en caseta no aporta.
 */
export function generarTokenAgente(idAcceso: string): { token: string; expira: number } {
    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const payload = Buffer.from(JSON.stringify({ exp, acceso: String(idAcceso || "") }), "utf8");
    const firma = crypto.createHmac("sha256", secreto()).update(payload).digest();
    return { token: `${base64Url(payload)}.${base64Url(firma)}`, expira: exp };
}
