import request, { Response, Headers } from "request";
import { log, fecha } from "../middlewares/log";

export async function peticionGetPanel(
    url: string,
    headers: Headers
): Promise<Response> {
    return new Promise((resolve, reject) => {
        console.log("SOY BACK SUBIENDO IMG");
        request.get(
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
        );
    });
}

export async function peticionPostPanel(
    url: string,
    data: any,
    usuario: string,
    contrasena: string
): Promise<Response> {
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
): Promise<Response> {
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

export async function peticionPutImg(
    url: string,
    data: any,
    webSessionValue: string,
    tokenValue: string
): Promise<Response> {
    return new Promise((resolve, reject) => {
        request.put(
            {
                url: `${url}&token=${tokenValue}`,
                headers: {
                    "Content-Type": "multipart/form-data",
                    Cookie: `language=en; ${webSessionValue}`,
                },
                formData: data,
                timeout: 10000,
            },
            (err, res, body) => {
                if (err) {
                    handleRequestError(err, reject);
                    return;
                }
                handleResponse(res, body, reject, resolve);
            }
        );
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
        request
            .get(uri, options, (err, res, body) => {
                if (err) {
                    handleRequestError(err, reject);
                    return;
                }
                if (res.statusCode === 401) {
                    log(`${fecha()} ERROR ❌: Credenciales inválidas.\n`);
                    return reject("Credenciales inválidas.");
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