import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Types } from 'mongoose';
import { DecodedTokenUser } from '../types/jsonwebtoken';
import Usuarios from "../models/Usuarios";
import Visitantes from "../models/Visitantes";
import { fecha, log } from "../middlewares/log";
import { validarModelo } from "../validators/validadores";
import { isEmptyObject } from "../utils/utils";

import { CONFIG } from "../config";
import { UserRequest } from "../types/express";

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const decoded = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;
        let registro = null;
        registro = (await Usuarios.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(decoded.id),
                },
            },
            {
                $lookup: {
                    from: "roles",
                    localField: "rol",
                    foreignField: "rol",
                    as: "rolNombres",
                    pipeline: [{ $project: { nombre: 1 } }],
                },
            },
            {
                $project: {
                    _id: 1,
                    rol: {
                        $map: {
                            input: "$rolNombres",
                            as: "rol",
                            in: "$$rol.nombre",
                        },
                    },
                    nombre: 1,
                    apellido_pat: 1,
                    apellido_mat: 1,
                    img_usuario: 1,
                    movil: 1,
                    telefono: 1,
                    extension: 1
                },
            },
        ]))[0];
        registro = registro || (await Visitantes.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(decoded.id),
                },
            },
            {
                $lookup: {
                    from: "roles",
                    localField: "rol",
                    foreignField: "rol",
                    as: "rolNombres",
                    pipeline: [{ $project: { nombre: 1 } }],
                },
            },
            {
                $project: {
                    _id: 1,
                    rol: {
                        $map: {
                            input: "$rolNombres",
                            as: "rol",
                            in: "$$rol.nombre",
                        },
                    },
                    nombre: 1,
                    apellido_pat: 1,
                    apellido_mat: 1,
                    img_usuario: 1,
                    movil: 1,
                    telefono: 1,
                    extension: 1
                },
            },
        ]))[0]

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Usuario no encontrado" });
            return;
        }
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function redirijirUserVisit(req: Request, res: Response) {
    try {
        const rol = (req as UserRequest).role;
        const esVisit = rol.includes(10);
        if (esVisit) {
            modificarVisitante(req, res);
        } else {
            modificar(req, res);
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { nombre, usuario, apellido_pat, apellido_mat, movil, telefono, extension, contrasena } = req.body;

        const updateData: any = {
            nombre,
            usuario,
            apellido_pat,
            apellido_mat,
            movil,
            telefono,
            extension,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
        };

        if (contrasena) {
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }

        Usuarios.findByIdAndUpdate(
            id_usuario,
            { $set: updateData },
            { runValidators: true, projection: { nombre: 1 } }
        )
            .then((reg_searched) => {
                if (!reg_searched) {
                    res.status(200).json({ estado: false, mensaje: "Usuario no encontrado" });
                    return;
                }
                res.status(200).json({ estado: true });
                return;
            })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({ estado: false, mensaje: "Revisa que los datos que estás ingresando sean correctos.", mensajes });
                    return;
                }
                res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
            });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarVisitante(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { nombre, usuario, apellido_pat, apellido_mat, movil, telefono, extension, contrasena } = req.body;

        const updateData: any = {
            nombre,
            usuario,
            apellido_pat,
            apellido_mat,
            movil,
            telefono,
            extension,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
        };

        if (contrasena) {
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }

        Visitantes.findByIdAndUpdate(
            id_usuario,
            { $set: updateData },
            { runValidators: true, projection: { nombre: 1 } }
        )
            .then((reg_searched) => {
                if (!reg_searched) {
                    res.status(200).json({ estado: false, mensaje: "Usuario no encontrado" });
                    return;
                }
                res.status(200).json({ estado: true });
                return;
            })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({ estado: false, mensaje: "Revisa que los datos que estás ingresando sean correctos.", mensajes });
                    return;
                }
                res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
            });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}