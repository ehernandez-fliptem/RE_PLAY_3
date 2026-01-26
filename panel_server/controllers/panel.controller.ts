import { Request, Response } from "express";
import Hikvision from "../classes/Hikvision";
const { log, fecha } = require("../middlewares/log");

export async function probarConexion(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena } = req.body.panel;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "");
        const resPanel = await HVPANEL.testConnection();
        res.status(200).send({ estado: resPanel, mensaje: resPanel ? "" : "Hubo un problema al realizar la conexión con el panel." });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTokenValue(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena } = req.body.panel;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "");
        await HVPANEL.getTokenValue();
        if (HVPANEL.token && HVPANEL.web_session) {
            res.status(200).send({ estado: true, datos: { token: HVPANEL.token, web_session: HVPANEL.web_session } });
            return;
        }
        res.status(200).send({ estado: false, mensaje: "Hubo un problema al obtener la información del panel." });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerEventos(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena } = req.body.panel;
        const { inicio, final, tipo_evento } = req.body.datos;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "");
        const eventosPanel = await HVPANEL.getAllEvents({ inicio, final, tipo_evento })
        res.status(200).json({ estado: true, datos: eventosPanel })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerImagenEvento(req: Request, res: Response): Promise<void> {
    try {
        const { uri, usuario, contrasena } = req.body;
        const HVPANEL = new Hikvision("", usuario, contrasena, "");
        const base64 = await HVPANEL.getEventImage(uri);
        res.status(200).json({ estado: true, datos: base64 })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}