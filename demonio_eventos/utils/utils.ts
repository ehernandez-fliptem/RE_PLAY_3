import CryptoJS from "crypto-js";

/**
 * @function
 * @name encryptPassword
 * @description Función para obtener una contraseña y/o string encriptado.
 * @param password - Contraseña a encriptar
 * @param secretKey - Llave secreta para encriptar.
*/
export function encryptPassword(password: string, secretKey: string): string {
    try {
        const encrypted = CryptoJS.AES.encrypt(password, secretKey).toString();
        return encrypted;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name decryptPassword
 * @description Función para desencriptar una contraseña y/o string encriptado.
 * @param encryptedPassword - Contraseña/String encriptada
 * @param secretKey - Llave secreta para desencriptar.
*/
export function decryptPassword(encryptedPassword: string, secretKey: string): string {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted;
    } catch (error) {
        throw error;
    }
}