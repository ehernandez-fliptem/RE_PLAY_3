import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Usuarios, { IUsuario } from "../models/Usuarios";
import Visitantes from "../models/Visitantes";
import { DecodedTokenUser } from '../types/jsonwebtoken';
import { UserRequest } from "../types/express";
import { fecha, log } from "./log";
import { CONFIG } from "../config";
import Accesos from "../models/Accesos";

/**
 * @function
 * @name validarTokenYRol
 * @description Middleware para validar el token y rol del usuario.
 * @param rolesPermitidos - Arreglo de roles permitidos.
 */
export function validarTokenYRol(rolesPermitidos: number[] = [], isRoot: boolean = false) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id_acceso = req.headers["x-access-default-entrance"] as string;
            const tokenHyundai = req.headers["x-access-token-hyundai"] as string;
            if (tokenHyundai === CONFIG.SECRET_HYUNDAI) {
                return next();
            }

            const token = req.headers["x-access-token"] as string;
            if (!token) {
                log(`${fecha()} ERROR: Token vacío \n\n`);
                res.status(419).json({ estado: false, mensaje: "Token vacío." });
                return;
            }

            const decoded = jwt.verify(token, CONFIG.SECRET) as DecodedTokenUser;
            let registro = null;
            registro = await Usuarios.findOne({ _id: decoded.id }, "nombre rol esRoot activo")
            registro = registro || await Visitantes.findOne({ _id: decoded.id }, "nombre rol activo");
            if (!registro) {
                log(`${fecha()} ERROR: Usuario no existe. \n\n`);
                res.status(419).json({ estado: false, mensaje: "No se encontró tu información en el sistema." });
                return;
            }
            if (!registro.activo) {
                log(`${fecha()} ERROR: Usuario no  inactivo. \n\n`);
                res.status(419).json({ estado: false, mensaje: "Actualmente tu usuario se encuentra inactivo, contacta con un administrador para reactivar tu cuenta." });
                return;
            }

            if (!rolesPermitidos.some((rol) => registro.rol.includes(rol))) {
                log(`${fecha()} ERROR: No autorizado.\n`);
                res.status(401).json({ estado: false, mensaje: "No autorizado." });
                return;
            }

            if (!registro.rol.includes(10)) {
                const acceso_existe = await Accesos.findById(id_acceso, 'activo');
                if (!acceso_existe) {
                    log(`${fecha()} ERROR: Acceso no existe o inactivo. \n\n`);
                    res.status(419).json({ estado: false, mensaje: "No se encontró información del acceso asignado." });
                    return;
                }
                if (!acceso_existe.activo) {
                    log(`${fecha()} ERROR: Usuario no  inactivo. \n\n`);
                    res.status(419).json({ estado: false, mensaje: "Actualmente el se encuentra inactivo, debes reiniciar sesión para validar la información." });
                    return;
                }
                if (!(registro as IUsuario)?.esRoot && isRoot) {
                    log(`${fecha()} ERROR: Usuario no maestro. \n\n`);
                    res.status(419).json({ estado: false, mensaje: "No cuentas con los permisos necesarios." });
                    return;
                }
            }
            (req as UserRequest).userId = registro._id;
            (req as UserRequest).isMaster = !!(registro as any).esRoot;
            (req as UserRequest).accessId = id_acceso;
            (req as UserRequest).role = registro.rol;
            next();
        } catch (error: any) {
            log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
            if (error.name === "TokenExpiredError") {
                log(`${fecha()} ERROR: La sesión ha expirado, por favor inicie sesión de nuevo.\n`);
                res.status(419).send({ estado: false, mensaje: "La sesión ha expirado, por favor inicie sesión de nuevo." });
                return;
            }
            res.status(500).send({ estado: false, mensaje: error.message });
        }
    };
}