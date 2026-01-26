import { Request, Response } from "express";
import Hikvision from "../classes/Hikvision";
const { fecha, log } = require("../middlewares/log");

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena, token, web_session } = req.body.panel;
        const { codigo, nombre, activo, fecha_entrada, fecha_salida } = req.body.datos;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "", token, web_session);
        const resPanel = await HVPANEL.saveRegister({ codigo, nombre, activo, fecha_entrada, fecha_salida });
        res.status(200).json({ estado: true, datos: resPanel })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena, token, web_session } = req.body.panel;
        const { img_usuario, codigo, nombre, activo, fecha_entrada, fecha_salida } = req.body.datos;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "", token, web_session);
        const resPanel = await HVPANEL.saveRegister({ img_usuario, codigo, nombre, activo, fecha_entrada, fecha_salida });
        res.status(200).json({ estado: true, datos: resPanel })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function eliminar(req: Request, res: Response): Promise<void> {
    try {
        const { direccion_ip, usuario, contrasena } = req.body.panel;
        const { citas } = req.body;
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena, "");
        for await (let registro of citas) {
            await HVPANEL.deleteRegister(registro);
        }
        res.status(200).json({ estado: true, datos: HVPANEL.register_sync });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}