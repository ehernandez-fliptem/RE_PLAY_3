import { Request, Response } from "express";
import Hikvision from "../classes/Hikvision";
const { fecha, log } = require("../middlewares/log");

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena } = req.body.panel;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "");
        const registros = await HVPANEL.getAllUsers();
        res.status(200).json({ estado: true, datos: registros })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena, token, web_session  } = req.body.panel;
        const { img_usuario, id_general, nombre, activo, fecha_creacion } = req.body.datos;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "", token, web_session );
        const resPanel = await HVPANEL.saverUser({ img_usuario, id_general, nombre, activo, fecha_creacion });
        res.status(200).json({ estado: true, datos: resPanel })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena, token, web_session  } = req.body.panel;
        const { img_usuario, id_general, nombre, activo, fecha_creacion } = req.body.datos;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "", token, web_session );
        const resPanel = await HVPANEL.saverUser({ img_usuario, id_general, nombre, activo, fecha_creacion });
        res.status(200).json({ estado: true, datos: resPanel })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function desactivar(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena } = req.body.panel;
        const { usuarios } = req.body;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "");
        for await (let registro of usuarios) {
            await HVPANEL.deleteUser(registro);
        }
        res.status(200).json({ estado: true, datos: HVPANEL.register_sync });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}