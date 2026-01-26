import nodemailer from "nodemailer";
import Configuracion from "../models/Configuracion";
import { fecha, log } from "./log";

const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";

interface EmailData {
    destinatario: string;
    asunto: string;
    texto?: string;
    contenido: string;
    plusAttachments?: Array<{ path: string; cid: string }>;
}

/**
 * @function
 * @name sendEmail
 * @description Función asíncrona que envía un correo usando la librería de nodemailer.
 * @param datos - Objeto con la información requerida para el correo.
 */
export async function sendEmail({
    destinatario,
    asunto,
    texto = "",
    contenido,
    plusAttachments = [],
}: EmailData): Promise<boolean> {
    try {
        const config = await Configuracion.findOne({}, "imgCorreo");
        const attachments = [
            ...plusAttachments,
        ];
        // if (config?.imgCorreo) {
        //     attachments.unshift({
        //         path: config?.imgCorreo,
        //         cid: "logo",
        //     })
        // }

        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: MAIL_USER,
                pass: MAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: "SSLv3",
            },
        });

        await transporter.sendMail({
            from: `"Flipbot" <${MAIL_USER}>`,
            to: destinatario,
            subject: asunto,
            text: texto,
            html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                    <html xmlns="http://www.w3.org/1999/xhtml">
                        <head>
                            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                            <title>Counter CAD&LAN</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                            <style>
                                .boton {
                                    border: 1px solid #2e518b;
                                    padding: 10px;
                                    background-color: #2e518b;
                                    color: #ffffff;
                                    text-decoration: none;
                                    text-transform: uppercase;
                                    font-family: 'Helvetica', sans-serif;
                                    border-radius: 50px;
                                }
                            </style>
                        </head>
                        <body style="margin: 0; padding: 0;">
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                                        <div align="center"><img src=${config?.imgCorreo} alt="Logo_header" style="width:150px"></div>
                                    </td>
                                </tr>
                            </table>
                            ${contenido}
                            <hr style="height:1px;border-width:0;color:gray;background-color:gray">
                            <div align="center">
                                <b>Nota:</b> No responda a este mensaje de correo electrónico. El mensaje se envió desde una dirección que no puede aceptar correo electrónico entrante.
                            </div>
                        </body>
                    </html>`,
            attachments,
        });

        return true;
    } catch (error: Error | unknown | any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        return false;
    }
}