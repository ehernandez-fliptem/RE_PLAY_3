import nodemailer from "nodemailer";
import Configuracion from "../models/Configuracion";
import { fecha, log } from "./log";
import { CONFIG } from "../config";

const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";

// Ahora soportamos:
// - path (ruta local o URL)
// - dataUrl (data:image/png;base64,...)
// - content/base64
export type AttachmentInput =
  | { path: string; cid: string; filename?: string }
  | { dataUrl: string; cid: string; filename?: string }
  | { content: Buffer | string; cid: string; filename?: string; encoding?: string; contentType?: string };

interface EmailData {
  destinatario: string;
  asunto: string;
  texto?: string;
  contenido: string;
  plusAttachments?: AttachmentInput[];
  cuentaId?: string;
}

function attachmentFromInput(a: AttachmentInput) {
  // Caso DataURL
  if ("dataUrl" in a) {
    const match = a.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error("Attachment dataUrl inválido (se esperaba data:<mime>;base64,<data>).");
    }
    const contentType = match[1];
    const base64 = match[2];
    return {
      filename: a.filename || "attachment",
      content: base64,
      encoding: "base64",
      contentType,
      cid: a.cid,
    };
  }

  // Caso content directo
  if ("content" in a) {
    return {
      filename: a.filename || "attachment",
      content: a.content,
      encoding: a.encoding,
      contentType: a.contentType,
      cid: a.cid,
    };
  }

  // Caso path (ruta o URL)
  return {
    filename: a.filename,
    path: a.path,
    cid: a.cid,
  };
}

export async function sendEmail({
  destinatario,
  asunto,
  texto = "",
  contenido,
  plusAttachments = [],
  cuentaId,
}: EmailData): Promise<boolean> {
  try {
    const config = await Configuracion.findOne({}, "imgCorreo correo_cuentas").lean<any>();

    // Preparamos attachments que vienen desde el caller
    const attachments = plusAttachments.map(attachmentFromInput);

    // Si quieres que el logo SIEMPRE se vea aunque sea ruta local:
    // 1) Adjunta logo como cid "logo"
    // 2) Usa <img src="cid:logo">
    //
    // Esto solo tiene sentido si imgCorreo es una ruta local o algo accesible.
    // Si imgCorreo es URL pública (https://...), también funciona directo sin cid.
    const logoIsPublicUrl = typeof config?.imgCorreo === "string" && /^https?:\/\//i.test(config.imgCorreo);

    if (config?.imgCorreo && !logoIsPublicUrl) {
      attachments.unshift({
        filename: "logo.png",
        path: config.imgCorreo,
        cid: "logo",
      });
    }

    const cuentaEnvActiva = !!(
      CONFIG.MAIL_VISITANTES_ID &&
      CONFIG.MAIL_VISITANTES_USER &&
      CONFIG.MAIL_VISITANTES_PASS &&
      CONFIG.MAIL_VISITANTES_HOST
    )
      ? {
          id: CONFIG.MAIL_VISITANTES_ID,
          nombre: CONFIG.MAIL_VISITANTES_NOMBRE || CONFIG.MAIL_VISITANTES_ID,
          proveedor: CONFIG.MAIL_VISITANTES_PROVIDER || "gmail",
          host: CONFIG.MAIL_VISITANTES_HOST,
          port: Number(CONFIG.MAIL_VISITANTES_PORT || 587),
          secure: !!CONFIG.MAIL_VISITANTES_SECURE,
          requireTLS: CONFIG.MAIL_VISITANTES_REQUIRE_TLS !== false,
          user: CONFIG.MAIL_VISITANTES_USER,
          pass: CONFIG.MAIL_VISITANTES_PASS,
          fromName: CONFIG.MAIL_VISITANTES_FROM_NAME || "Flipbot",
          fromEmail: CONFIG.MAIL_VISITANTES_FROM_EMAIL || CONFIG.MAIL_VISITANTES_USER,
          activo: true,
        }
      : null;

        // Priorizar cuenta definida en .env sobre la almacenada en BD cuando comparten id.
        // Esto evita fallos por credenciales desactualizadas guardadas en configuracion.
        const cuentasDisponibles = [
            ...(cuentaEnvActiva ? [cuentaEnvActiva] : []),
            ...(Array.isArray(config?.correo_cuentas) ? config.correo_cuentas : []),
        ];

    const cuentaSeleccionada = Array.isArray(cuentasDisponibles)
      ? cuentasDisponibles.find(
          (c: any) =>
            c?.activo !== false &&
            typeof c?.id === "string" &&
            c.id === cuentaId
        )
      : null;

    const smtpHost = String(cuentaSeleccionada?.host || "smtp.office365.com");
    const smtpPort = Number(cuentaSeleccionada?.port || 587);
    const smtpSecure = Boolean(cuentaSeleccionada?.secure || false);
    const smtpRequireTls = cuentaSeleccionada?.requireTLS !== false;
    const smtpUser = cuentaSeleccionada ? String(cuentaSeleccionada?.user || "") : MAIL_USER;
    const smtpPass = cuentaSeleccionada ? String(cuentaSeleccionada?.pass || "") : MAIL_PASS;
    const fromName = String(cuentaSeleccionada?.fromName || "Flipbot");
    const fromEmail = String(cuentaSeleccionada?.fromEmail || smtpUser || MAIL_USER);

    if (!smtpUser || !smtpPass) {
      console.error("MAIL ACCOUNT INCOMPLETA:", {
        cuentaId,
        host: smtpHost,
        port: smtpPort,
        hasUser: !!smtpUser,
        hasPass: !!smtpPass,
      });
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: smtpRequireTls,
      auth: { user: smtpUser, pass: smtpPass },
      logger: true,
      debug: true,
    });


    const logoImgHtml = config?.imgCorreo
      ? logoIsPublicUrl
        ? `<img src="${config.imgCorreo}" alt="Logo_header" style="width:150px" />`
        : `<img src="cid:logo" alt="Logo_header" style="width:150px" />`
      : "";

    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Flipbot</title>
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
          <div align="center">${logoImgHtml}</div>
        </td>
      </tr>
    </table>

    ${contenido}

    <hr style="height:1px;border-width:0;color:gray;background-color:gray" />
    <div align="center">
      <b>Nota:</b> No responda a este mensaje de correo electrónico. El mensaje se envió desde una dirección que no puede aceptar correo electrónico entrante.
    </div>
  </body>
</html>`;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: destinatario,
      subject: asunto,
      text: texto,
      html,
      attachments,
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];
    const pendiente = Array.isArray((info as any).pending) ? (info as any).pending : [];
    const acceptedCount = accepted.length;

    log(
      `${fecha()} MAIL INFO: ${JSON.stringify({
        to: destinatario,
        subject: asunto,
        messageId: info.messageId,
        response: info.response,
        accepted,
        rejected,
        pending: pendiente,
      })}\n`
    );

    if (acceptedCount === 0 || rejected.length > 0) {
      console.error("MAIL NO CONFIRMADO POR SMTP:", {
        to: destinatario,
        accepted,
        rejected,
        pending: pendiente,
        response: info.response,
      });
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("EMAIL ERROR FULL:", error);
    console.error("EMAIL ERROR RESPONSE:", error?.response);
    console.error("EMAIL ERROR CODE:", error?.code);
    log(`${fecha()} ERROR: ${error?.name || "Error"}: ${error?.message || error}\n`);
    return false;
 }

}
