import { Request, Response, NextFunction } from "express";
import { getClientIp } from '@supercharge/request-ip';
import Logs from "../models/plugin/Logs";
import { UserRequest } from "../types/express";

/**
 * @function logRequest
 * @description Middleware para registrar las peticiones HTTP en la base de datos, manejando respuestas grandes y peticiones no concluidas.
 */
export async function logRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    let isCompleted = false;

    const logData = {
        metodo: req.method,
        endpoint: req.originalUrl,
        headers: req.headers,
        query: req.query,
        body: req.body,
        ip: getClientIp(req),
        user_agent: req.headers["user-agent"] || "Desconocido",
        fecha_creacion: new Date(),
    };

    const MAX_RESPONSE_SIZE = 1000;

    const truncateResponse = (response: any): any => {
        if (typeof response === "string") {
            return response.length > MAX_RESPONSE_SIZE
                ? response.slice(0, MAX_RESPONSE_SIZE) + "..."
                : response;
        }
        return response;
    };

    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any): Response {
        responseBody = body;
        return originalSend.call(this, body);
    };

    res.on("finish", async () => {
        isCompleted = true;
        try {
            await Logs.create({
                ...logData,
                status: res.statusCode,
                respuesta: truncateResponse(responseBody || null),
                id_usuario: (req as UserRequest).userId || null,
                duracion_ms: Date.now() - startTime,
            });
        } catch (error) {
            console.error("Error al registrar el log de la petición:", error);
        }
    });

    req.on("close", async () => {
        if (!isCompleted) {
            try {
                await Logs.create({
                    ...logData,
                    status: 499,
                    respuesta: null,
                    id_usuario: (req as UserRequest).userId || null,
                    duracion_ms: Date.now() - startTime,
                });
            } catch (error) {
                console.error("Error al registrar el log de la petición cerrada:", error);
            }
        }
    });

    next();
}