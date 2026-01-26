import { DecodedTokenUser } from "../types/jsonwebtoken";
import jwt from "jsonwebtoken";
import { fecha, log } from "./log";
import { CONFIG } from "../config";
import { NextFunction, Request, Response } from "express";

export async function validarToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const token = req.headers["x-access-token"] as string;
        if (token !== CONFIG.SECRET_HYUNDAI) {
            log(`${fecha()} ERROR: Token vacío \n\n`);
            res.status(419).json({ estado: false, mensaje: "Token vacío." });
            return;
        }
        return next();
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        if (error.name === "TokenExpiredError") {
            log(`${fecha()} ERROR: La sesión ha expirado, por favor inicie sesión de nuevo.\n`);
            res.status(419).send({ estado: false, mensaje: "La sesión ha expirado, por favor inicie sesión de nuevo." });
            return;
        }
        res.status(500).send({ estado: false, mensaje: error.message });
    }
}