import { Request, Response } from "express";
import { log, fecha } from "../middlewares/log";

export async function obtenerDashboard(req: Request, res: Response): Promise<void> {
    try {
        res.status(501).json({ estado: false, mensaje: "En producción" });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}