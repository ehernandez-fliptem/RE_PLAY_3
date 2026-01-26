import { Request, Response, NextFunction } from "express";
import { UserRequest } from "../types/express";
import { modificar, modificarVisitante } from '../controllers/perfil.controller';
import { fecha, log } from "./log";

export async function redirijirUserVisit(req: Request, res: Response, next: NextFunction) {
    try {
        const rol = (req as UserRequest).role;
        const esVisit = rol.includes(10);
        if (esVisit) {
            modificarVisitante(req, res);
        } else {
            modificar(req, res);
        }
        next();
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}