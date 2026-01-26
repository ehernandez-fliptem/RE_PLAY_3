import { Request, Response } from "express";
import { enviarCorreoErrorSoporte } from "../utils/correos";
import dayjs from "dayjs";
import { log } from "console";
import { fecha } from "../middlewares/log";

export async function notificarError(req: Request, res: Response) {
    try {
        const { mensaje, componente, stack, fecha } = req.body;
        const fechaFormat = dayjs(fecha).format("DD/MM/YYYY, HH:mm:ss a");

        const correoSoporte = "soporte@recepcionelectronica.com";
        const response = await enviarCorreoErrorSoporte(correoSoporte, {
            mensaje,
            componente,
            stack,
            fecha: fechaFormat,
        });
        if (!response) {
            res.status(200).send({ estado: false, mensaje: "Hubo un error al enviar el correo." });
            return;
        }
        res.status(200).send({ estado: true, mensaje: "Correo enviado correctamente" });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` })
    }
}