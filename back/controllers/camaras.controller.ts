import { Request, Response } from "express";
import { PipelineStage, Types } from 'mongoose';
import jwt from "jsonwebtoken";
import { DecodedTokenUser } from '../types/jsonwebtoken';
import Camaras from "../models/Camaras";
import Accesos from "../models/Accesos";
import TiposEventos from "../models/TiposEventos";
import Hikvision from "../classes/Hikvision";
import { validarModelo } from "../validators/validadores";
import { customAggregationForDataGrids, isEmptyObject, decryptPassword, encryptPassword } from "../utils/utils";
import { QueryParams } from "../types/queryparams";
import { fecha, log } from "../middlewares/log";

import { CONFIG } from "../config";

export async function obtenerTodos(req: Request, res: Response): Promise<void> {

    try {
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB,
        } = customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["nombre"]);

        const aggregation: PipelineStage[] = [];

        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB,
                },
            });
        }

        aggregation.push(
            {
                $lookup: {
                    from: "accesos",
                    localField: "id_acceso",
                    foreignField: "_id",
                    as: "acceso",
                    pipeline: [{ $project: { nombre: 1 } }],
                },
            },
            {
                $set: {
                    acceso: { $arrayElemAt: ["$acceso", -1] },
                },
            },
            {
                $set: {
                    acceso: "$acceso.nombre",
                },
            },
            {
                $project: {
                    nombre: 1,
                    habilitar_citas: 1,
                    acceso: 1,
                    tipo_evento: 1,
                    activo: 1,
                },
            },
            {
                $sort: sortMDB || { nombre: 1 },
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [{ $count: "count" }],
                },
            }
        );

        const registros = await Camaras.aggregate(aggregation);

        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosDemonio(req: Request, res: Response): Promise<void> {
    try {
        const registros = await Camaras.find(
            { activo: true },
            "nombre usuario direccion_ip contrasena tipo_evento"
        );
        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {

        const registro = await Camaras.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(req.params.id),
                },
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "id_acceso",
                    foreignField: "_id",
                    as: "acceso",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            }
                        }
                    ],
                },
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "creado_por",
                    foreignField: "_id",
                    as: "creado_por",
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "modificado_por",
                    foreignField: "_id",
                    as: "modificado_por",
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    acceso: { $arrayElemAt: ["$acceso", 0] },
                    creado_por: { $arrayElemAt: ["$creado_por", 0] },
                    modificado_por: { $arrayElemAt: ["$modificado_por", 0] },
                },
            },
            {
                $set: {
                    acceso: "$acceso.nombre",
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                },
            },
            {
                $project: {
                    contrasena: 0,
                },
            },
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Cámara no encontrada." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevaCamara(req: Request, res: Response): Promise<void> {
    try {
        const tipos_eventos = await TiposEventos.find({ activo: true, tipo: { $in: [5, 6, 7] } });
        const accesos = await Accesos.find({ activo: true }, "nombre").sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: { tipos_eventos, accesos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUnoFormEditar(req: Request, res: Response): Promise<void> {

    try {
        const registro = await Camaras.findById(req.params.id, { contrasena: 0 });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Cámara no encontrada." });
            return;
        }
        const accesos = await Accesos.find({ activo: true }, "nombre");
        const tipos_eventos = await TiposEventos.find({ activo: true, tipo: { $in: [5, 6, 7] } });
        res.status(200).json({ estado: true, datos: { dispositivo: registro, accesos, tipos_eventos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, direccion_ip, usuario, contrasena, habilitar_citas, tipo_evento, id_acceso } = req.body;
        const creado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;
        const nuevoRegistro = new Camaras({
            nombre,
            direccion_ip,
            usuario,
            contrasena,
            habilitar_citas,
            tipo_evento,
            id_acceso,
            creado_por: creado_porID.id,
            fecha_creacion: Date.now(),
        });

        const mensajes = await validarModelo(nuevoRegistro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: "Revisa que los datos que estás ingresando sean correctos.",
                mensajes,
            });
            return;
        }

        await nuevoRegistro.save();
        await Accesos.updateMany(
            { _id: { $in: id_acceso } },
            { $addToSet: { hikvision_dispositivos: nuevoRegistro._id } }
        );
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, direccion_ip, usuario, contrasena, habilitar_citas, tipo_evento, id_acceso } = req.body;
        const modificado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;
        const updateData: any = {
            nombre,
            direccion_ip,
            usuario,
            habilitar_citas,
            tipo_evento,
            id_acceso,
            fecha_modificacion: Date.now(),
            modificado_por: modificado_porID.id,
        };

        if (contrasena) {
            const hash = encryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }

        Camaras.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { runValidators: true, new: false }
        )
            .then(async (reg_saved) => {
                if (!reg_saved) {
                    res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
                    return;
                }
                // Sincronizar Accesos:
                const accesoPrevio = reg_saved.id_acceso;
                const accesoNuevo = id_acceso;

                if (!accesoPrevio) {
                    await Accesos.updateMany(
                        { _id: { $in: accesoNuevo } },
                        { $push: { hikvision_dispositivos: req.params.id } }
                    );
                }
                else {
                    if (String(accesoPrevio) !== String(accesoNuevo)) {
                        await Accesos.updateMany(
                            { _id: { $in: accesoPrevio } },
                            { $pull: { hikvision_dispositivos: req.params.id } }
                        );
                        await Accesos.updateMany(
                            { _id: { $in: accesoNuevo } },
                            { $addToSet: { hikvision_dispositivos: req.params.id } }
                        );
                    }
                }
                res.status(200).json({ estado: true });
            })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({
                        estado: false,
                        mensaje: "Revisa que los datos que estás ingresando sean correctos.",
                        mensajes,
                    });
                    return;
                }
                res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
            });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Camaras.findByIdAndUpdate(req.params.id, {
            $set: { activo: !req.body.activo },
        });

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Cámara no encontrada." });
            return;
        }

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
export async function probarConexion(req: Request, res: Response): Promise<void> {
    try {
        const { usuario, contrasena, direccion_ip } = req.body;
        let contrasena_probar = contrasena;

        if (req.params.id) {
            const registro = await Camaras.findById(req.params.id, "contrasena");
            if (!registro) {
                res.status(200).json({ estado: false, mensaje: "Cámara no encontrada." });
                return;
            }
            contrasena_probar = contrasena || decryptPassword(registro.contrasena, CONFIG.SECRET_CRYPTO);
        }
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena_probar);
        const conexion = await HVPANEL.testConnection();
        res.status(200).json(conexion);
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}