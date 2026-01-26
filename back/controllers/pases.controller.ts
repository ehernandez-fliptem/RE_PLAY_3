import { Request, Response } from "express";
import { PipelineStage, Types } from 'mongoose';
import { QueryParams } from "../types/queryparams";
import { UserRequest } from '../types/express';
import Pases from '../models/Pases';
import Usuarios, { IUsuario } from '../models/Usuarios';
import jwt from "jsonwebtoken";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";

import { CONFIG } from "../config";
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
            ["codigo", "empresa", "fabricante", "modelo", "vigente"]
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
                $lookup: {
                    from: "registros",
                    let: { paseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$id_pase", "$$paseId"] },
                                        { $eq: ["$activo", true] },
                                        {
                                            $lte: [
                                                "$fecha_entrada",
                                                "$$NOW"
                                            ]
                                        },
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "registros_en_uso"
                }
            },
            {
                $addFields: {
                    vigente: {
                        $not: [
                            {
                                $gt: [
                                    { $size: "$registros_en_uso" },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $set: {
                    empresa: { $arrayElemAt: ["$empresa", 0] },
                },
            },
            {
                $set: {
                    empresa: "$empresa.nombre",
                },
            },
            {
                $project: {
                    codigo: 1,
                    empresa: 1,
                    fabricante: 1,
                    modelo: 1,
                    tipo: 1,
                    vigente: 1,
                    activo: 1,
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
                $sort: sortMDB ? sortMDB : { codigo: 1 }
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
        const registros = await Pases.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
        const pases = await Pases.aggregate([
            {
                $match: {
                    $and: [
                        { activo: true },
                        isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
                }
            },
            {
                $lookup: {
                    from: "registros",
                    let: { paseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$id_pase", "$$paseId"] },
                                        { $eq: ["$activo", true] },
                                        {
                                            $lte: [
                                                "$fecha_entrada",
                                                "$$NOW"
                                            ]
                                        },
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "registros_en_uso"
                }
            },
            {
                $addFields: {
                    vigente: {
                        $not: [
                            {
                                $gt: [
                                    { $size: "$registros_en_uso" },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { vigente: true },
                    ]
                }
            },
            {
                $sort: {
                    codigo: 1
                }
            }
        ]);
        res.status(200).json({ estado: true, datos: pases });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario
        const registro = await Pases.aggregate([
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
            {
                $project: {
                    codigo: 1,
                    fabricante: 1,
                    modelo: 1,
                    tipo: 1,
                    vigente: 1,
                    fecha_creacion: 1,
                    creado_por: 1,
                    fecha_modificacion: 1,
                    modificado_por: 1,
                    empresa: 1,
                    activo: 1
                }
            }
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Pase no encontrado." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function obtenerFormNuevoPase(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const empresas = await Empresas.find(isMaster ? { activo: true } : { _id: id_empresa, activo: true }, 'nombre pisos activo').sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: { empresas } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarPase(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario
        const registro = await Pases.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                        isMaster ? { activo: true } : { id_empresa: new Types.ObjectId(id_empresa), }
                    ]
                }
            },
            {
                $project: {
                    codigo: 1,
                    fabricante: 1,
                    modelo: 1,
                    tipo: 1,
                    id_empresa: 1
                }
            }
        ])
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Pase no encontrado." });
            return;
        }
        const empresas = await Empresas.find(isMaster ? {} : { _id: id_empresa }, 'nombre pisos activo').sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: { empresas, pase: registro[0] } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { codigo, fabricante, modelo, tipo, id_empresa } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const registro = new Pases({ codigo, fabricante, modelo, tipo, id_empresa: id_empresa ? id_empresa : null, creado_por: id_usuario });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        await registro.save();
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { codigo, fabricante, modelo, tipo, id_empresa } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const registro = await Pases.findByIdAndUpdate(
            req.params.id,
            {
                codigo,
                fabricante,
                modelo,
                tipo,
                id_empresa,
                modificado_por: id_usuario,
                fecha_modificacion: Date.now()
            },
            { new: true, runValidators: true })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
                    return;
                }
                else {
                    res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
                    return;
                }
            });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Pase no encontrado' });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const resultado = await Pases.findByIdAndUpdate(req.params.id, { $set: { activo: !req.body.activo } });
        if (resultado) {
            res.status(200).json({ estado: true });
        } else {
            res.status(200).json({ estado: false, mensaje: 'Pase no encontrado.' });
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}