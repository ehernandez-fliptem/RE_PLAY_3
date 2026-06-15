import { Request, Response, NextFunction } from "express";
import Configuracion from "../models/Configuracion";
import { fecha, log } from "./log";

export async function validarCapacitacionPublicaActiva(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const configuracion = await Configuracion.findOne({}, "habilitarCapacitacionPublica").lean();
        if (!configuracion?.habilitarCapacitacionPublica) {
            res.status(404).json({
                estado: false,
                codigo: "CAPACITACION_PUBLICA_DESACTIVADA",
                mensaje: "La capacitacion publica no esta disponible.",
            });
            return;
        }
        next();
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
