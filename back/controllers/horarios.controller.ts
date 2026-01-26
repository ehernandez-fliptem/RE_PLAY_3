import { Request, Response } from "express";
import { PipelineStage, Types } from 'mongoose';
import { QueryParams } from "../types/queryparams";
import { UserRequest } from '../types/express';
import Horarios from "../models/Horarios";
import Usuarios, { IUsuario } from "../models/Usuarios";
import Asignaciones from "../models/Asignaciones";
import { log, fecha } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import Empresas from "../models/Empresas";

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        isMaster ? {} : { id_empresa: id_empresa }
                    ]
                }
            },
            {
                $project: {
                    nombre: 1,
                    activo: 1
                }
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB
                }
            });
        }
        aggregation.push(
            {
                $sort: sortMDB ? sortMDB : { nombre: 1 }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        )
        const registros = await Horarios.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario
        const registro = await Horarios.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                        isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
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
                $lookup: {
                    from: "empresas",
                    localField: "id_empresa",
                    foreignField: "_id",
                    as: "empresa",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    creado_por: { $arrayElemAt: ["$creado_por", 0] },
                    modificado_por: { $arrayElemAt: ["$modificado_por", 0] },
                    empresa: { $arrayElemAt: ["$empresa", 0] },
                },
            },
            {
                $set: {
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                    empresa: "$empresa.nombre",
                },
            },
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Horario no encontrado." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevoHorario(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario
        const empresas = await Empresas.find(isMaster ? { activo: true } : { _id: id_empresa, activo: true }, 'nombre activo').sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: { empresas } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormEditarHorario(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario
        const empresas = await Empresas.find(isMaster ? {} : { _id: id_empresa }, 'nombre activo').sort({ nombre: 1 });
        const registro = await Horarios.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                        isMaster ? { activo: true } : { id_empresa: new Types.ObjectId(id_empresa), activo: true }
                    ]
                }
            },
            {
                $project: {
                    nombre: 1,
                    id_empresa: 1,
                    horario: 1
                }
            }
        ])
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Horario no encontrado." });
            return;
        }
        res.status(200).json({ estado: true, datos: { empresas, horario: registro[0] } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, horario, id_empresa } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const nuevoRegistro = new Horarios({ nombre, horario, id_empresa, creado_por: id_usuario, fecha_creacion: Date.now() });
        const mensajes = await validarModelo(nuevoRegistro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: "Revisa que los datos que estás ingresando sean correctos.", mensajes });
            return;
        }
        await nuevoRegistro.save();
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { horario, id_empresa } = req.body;
        const id_usuario = (req as UserRequest).userId;
        await Horarios.findByIdAndUpdate(
            req.params.id,
            { $set: { horario, modificado_por: id_usuario, id_empresa, fecha_modificacion: Date.now() } },
            { runValidators: true, projection: { nombre: 1 } }
        )
            .then(async (reg_saved) => {
                if (!reg_saved) {
                    res.status(200).json({ estado: false, mensaje: "Horario no encontrado" });
                    return;
                }
                res.status(200).json({ estado: true });
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

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const resultado = await Horarios.findByIdAndUpdate(req.params.id, { $set: { activo: !req.body.activo } });
        if (resultado) {
            if (req.body.activo) {
                await Usuarios.updateMany({ id_horario: req.params.id }, { $set: { id_horario: null } });
                await Asignaciones.updateMany({ id_horario: req.params.id }, { $set: { activo: false } });
            }
            res.status(200).json({ estado: true });
        } else {
            res.status(200).json({ estado: false, mensaje: "Horario no encontrado." });
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

