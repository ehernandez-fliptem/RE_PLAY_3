import request, { Response, Headers } from "request";
import request_img from 'request';
import { log, fecha } from "../middlewares/log";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";

const reqImg = request_img.defaults({ encoding: null });

export async function peticionGetPanel(
    url: string,
    usuario: string,
    contrasena: string,
    headers?: Headers,
): Promise<Response | unknown> {
    return new Promise((resolve, reject) => {
        request
            .get(
                {
                    url,
                    headers,
                    json: true,
                    timeout: 10000,
                },
                (err, res, body) => {
                    if (err) {
                        handleRequestError(err, reject);
                        return;
                    }
                    handleResponse(res, body, reject, resolve);
                }
            )
            .auth(usuario, contrasena, false);
    });
}

export async function peticionGetPanelNoAuth(
    url: string,
    headers?: Headers,
): Promise<Response | unknown> {
    return new Promise((resolve, reject) => {
        request
            .get(
                {
                    url,
                    headers,
                    json: true,
                    timeout: 10000,
                },
                (err, res, body) => {
                    if (err) {
                        handleRequestError(err, reject);
                        return;
                    }
                    handleResponse(res, body, reject, resolve);
                }
            )
    });
}


export async function peticionPostPanel(
    url: string,
    data: any,
    usuario: string,
    contrasena: string
): Promise<Response | unknown> {
    return new Promise((resolve, reject) => {
        request
            .post(
                {
                    url,
                    body: data,
                    json: true,
                    timeout: 10000,
                },
                (err, res, body) => {
                    if (err) {
                        handleRequestError(err, reject);
                        return;
                    }
                    handleResponse(res, body, reject, resolve);
                }
            )
            .auth(usuario, contrasena, false);
    });
}

export async function peticionPutPanel(
    url: string,
    data: any,
    usuario: string,
    contrasena: string
): Promise<Response | unknown> {
    return new Promise((resolve, reject) => {
        request
            .put(
                {
                    url,
                    body: data,
                    json: true,
                    timeout: 10000,
                },
                (err, res, body) => {
                    if (err) {
                        handleRequestError(err, reject);
                        return;
                    }
                    handleResponse(res, body, reject, resolve);
                }
            )
            .auth(usuario, contrasena, false);
    });
}

    export type HikvisionResponse =
    | { statusCode?: number; statusString?: string; [key: string]: any }
    | string;

    /**
     * Crear tarjeta usando curl (Digest Auth).
     * Endpoint típico: /ISAPI/AccessControl/CardInfo/Record?format=json
     */
    export function peticionPostCardCurl(
    url: string,
    usuario: string,
    contrasena: string,
    cardPayload: any // ej: { CardInfo: { employeeNo, cardNo, cardType } }
    ): Promise<HikvisionResponse> {
    return new Promise((resolve, reject) => {
        if (!url) return reject(new Error("Falta la URL del endpoint ISAPI"));
        if (!usuario) return reject(new Error("Falta el usuario"));
        if (!contrasena) return reject(new Error("Falta la contraseña"));
        if (!cardPayload) return reject(new Error("Falta el payload de la tarjeta"));

        const jsonBody = JSON.stringify(cardPayload);

        const curlArgs = [
        "--silent",
        "--show-error",
        "--digest",
        "-u",
        `${usuario}:${contrasena}`,
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
        "-d",
        jsonBody,
        ];

        execFile(
        "curl",
        curlArgs,
        { windowsHide: true, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
            const out = (stdout || "").trim();
            const errText = (stderr || "").trim();

            if (error) {
            if (errText) return reject(new Error(errText));
            return reject(new Error(error.message || "Error ejecutando curl"));
            }

            if (!out) {
            return reject(new Error("Hikvision respondió vacío (CardInfo)"));
            }

            // Hikvision a veces responde JSON, a veces texto
            try {
            return resolve(JSON.parse(out));
            } catch {
            return resolve(out);
            }
        }
        );
    });
    }

    export function peticionPutImg(
    url: string,
    usuario: string,
    contrasena: string,
    employeeNo: string,
    fpid: string,
    imageBuffer: Buffer, // Imagen en memoria (por ejemplo desde base64)
    imageName = "face.jpg" // Nombre opcional
    ): Promise<HikvisionResponse> {
    return new Promise((resolve, reject) => {
        // 1) Carpeta temporal para imágenes
        const tempDir = path.join(process.cwd(), "temp_faces");

        // 2) Crear carpeta si no existe
        if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        }

        // 3) Ruta final de la imagen
        const imagePath = path.join(tempDir, imageName);

        // 4) Guardar imagen en disco
        try {
        fs.writeFileSync(imagePath, imageBuffer);
        } catch {
        return reject(new Error("No se pudo guardar la imagen en disco"));
        }

        // 5) Validaciones simples
        if (!url) return reject(new Error("Falta la URL del endpoint ISAPI"));
        if (!usuario) return reject(new Error("Falta el usuario"));
        if (!contrasena) return reject(new Error("Falta la contraseña"));
        if (!employeeNo) return reject(new Error("Falta employeeNo"));
        if (!fpid) return reject(new Error("Falta FPID"));

        // 6) Armamos el curl EXACTO que ya funciona
        const curlArgs = [
        "--silent",
        "--show-error",
        "--digest",
        "-u",
        `${usuario}:${contrasena}`,
        "-X",
        "POST",
        url,
        "-F",
        `FaceDataRecord={"faceLibType":"blackFD","FDID":"1","FPID":"${fpid}","employeeNo":"${employeeNo}"}`,
        "-F",
        `img=@${imagePath};type=image/jpeg`,
        ];

        // 7) Ejecutar curl
        execFile(
        "curl",
        curlArgs,
        { windowsHide: true, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
            const out = (stdout || "").trim();
            const errText = (stderr || "").trim();

            // 7.1 Error de ejecución
            if (error) {
            if (errText) return reject(new Error(errText));
            return reject(new Error(error.message || "Error ejecutando curl"));
            }

            // 7.2 Respuesta vacía
            if (!out) return reject(new Error("Hikvision respondió vacío"));

            // 7.3 Parsear JSON o devolver texto
            try {
            const parsed = JSON.parse(out);
            return resolve(parsed);
            } catch {
            return resolve(out);
            }
        }
        );
    });
    }


export async function peticionPutImg_bak(
    url: string,
    data: any    
    //webSessionValue: string,
    //tokenValue: string
): Promise<Response | unknown> {
    return new Promise((resolve, reject) => {
        request
            .put(
                {
                    /*
                    url: `${url}&token=${tokenValue}`,
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Cookie: `language=en; ${webSessionValue}`,
                    },
                    */
                    url,
                    formData: data,
                    headers: {
                        "Content-Type": "application/json"
                    },                    
                    timeout: 10000,
                    json: true
                },
                (err, res, body) => {
                    if (err) {
                        handleRequestError(err, reject);
                        return;
                    }
                    handleResponse(res, body, reject, resolve);
                }
            )
            .auth("admin", "Bardahl2025.", false);;
    });
}

export async function peticionGetImg(
    uri: string,
    usuario: string,
    contrasena: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const options = {
            timeout: 10000,
            headers: {
                "accept-encoding": "gzip, deflate",
            },
        };
        reqImg
            .get(uri, options, (err, res, body) => {
                if (err) {
                    handleRequestError(err, reject);
                    return;
                }
                if (res.statusCode === 401) {
                    log(`${fecha()} ERROR ❌: Credenciales inválidas.\n`);
                    return reject({ name: "ERRAUTH", message: "Credenciales inválidas." });
                }
                const data =
                    "data:" +
                    res.headers["content-type"] +
                    ";base64," +
                    Buffer.from(body).toString("base64");
                resolve(data);
            })
            .auth(usuario, contrasena, false);
    });
}

function handleRequestError(err: any, reject: (reason?: any) => void): void {
    if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
        log(`${fecha()} ERROR: ${err.code}\n`);
        reject({ name: err.code, message: "No se pudo establecer la conexión con el panel." });
    } else if (err.code === "ECONNRESET") {
        log(`${fecha()} ERROR: ${err.code}\n`);
        reject({ name: err.code, message: "Se perdió la conexión con el panel." });
    } else {
        log(`${fecha()} ERROR: ${JSON.stringify(err)}\n`);
        reject({ name: err.code, message: "Hubo un error interno con el panel." });
    }
}

function handleResponse(
    res: any,
    body: any,
    reject: (reason?: any) => void,
    resolve: (value: any) => void
): void {
    if (res.statusCode === 200) {
        resolve(body);
    } else if (res.statusCode === 401) {
        log(`${fecha()} ERROR: Credenciales inválidas.\n`);
        reject({ name: "ERRAUTH", message: "Credenciales inválidas." });
    } else if (res.statusCode >= 400) {
        log(`${fecha()} ERROR-PANEL: ${body?.subStatusCode || "Error desconocido"}.\n`);
        reject({
            name: "ERROR-PANEL",
            message: `No se pudo procesar la solicitud: ${body?.subStatusCode || "Error desconocido"}.`,
        });
    }
}