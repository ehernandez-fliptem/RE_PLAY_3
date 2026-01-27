import nodemailer from "nodemailer";
import Configuracion from "../models/Configuracion";
import { fecha, log } from "./log";

const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";

// Ahora soportamos:
// - path (ruta local o URL)
// - dataUrl (data:image/png;base64,...)
// - content/base64
type AttachmentInput =
  | { path: string; cid: string; filename?: string }
  | { dataUrl: string; cid: string; filename?: string }
  | { content: Buffer | string; cid: string; filename?: string; encoding?: string; contentType?: string };

interface EmailData {
  destinatario: string;
  asunto: string;
  texto?: string;
  contenido: string;
  plusAttachments?: AttachmentInput[];
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
}: EmailData): Promise<boolean> {
  try {
    const config = await Configuracion.findOne({}, "imgCorreo").lean();

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

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user: MAIL_USER, pass: MAIL_PASS },
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

    await transporter.sendMail({
      from: `"Flipbot" <${MAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      text: texto,
      html,
      attachments,
    });

    return true;
  } catch (error: any) {
    console.error("EMAIL ERROR FULL:", error);
    console.error("EMAIL ERROR RESPONSE:", error?.response);
    console.error("EMAIL ERROR CODE:", error?.code);
    log(`${fecha()} ERROR: ${error?.name || "Error"}: ${error?.message || error}\n`);
    return false;
 }

}
