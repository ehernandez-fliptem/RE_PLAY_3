import { Request, Response } from "express";
import { PipelineStage, Types } from 'mongoose';
import { QueryParams } from "../types/queryparams";
import { UserRequest } from '../types/express';
import Horarios from "../models/Horarios";
import Usuarios, { IUsuario } from "../models/Usuarios";
import Asignaciones from "../models/Asignaciones";
import { log, fecha } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject, marcarDuplicados } from "../utils/utils";
import { validarModelo } from "../validators/validadores";

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
            ["nombre_horario", "nombre_usuario"]
        );
        const aggregation: PipelineStage[] = [
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuarios",
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    !isMaster ? { id_empresa: id_empresa } : {}
                                ]
                            }
                        },
                        {
                            $project: {
                                id_general: 1,
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                                }
                            }
                        },
                    ],
                }
            },
            {
                $lookup: {
                    from: "horarios",
                    localField: "id_horario",
                    foreignField: "_id",
                    as: "horario",
                    pipeline: [{ $project: { nombre: 1 } }],
                },
            },
            {
                $set: {
                    usuarios: { $arrayElemAt: ["$usuarios", 0] },
                    horario: { $arrayElemAt: ["$horario", 0] },
                },
            },
            {
                $set: {
                    id_general: "$usuario.id_general",
                    nombre_horario: "$horario.nombre",
                    nombre_usuario: "$usuarios.nombre",
                },
            },
            {
                $project: {
                    nombre_horario: 1,
                    nombre_usuario: 1,
                    activo: 1,
                },
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
                $sort: sortMDB ? sortMDB : { nombre_horario: 1 }
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
        const registros = await Asignaciones.aggregate(aggregation);
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
        const registro = await Asignaciones.aggregate([
            {
                $match: { _id: new Types.ObjectId(req.params.id) },
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuario",
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                                ]
                            }
                        },
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
                    from: "horarios",
                    localField: "id_horario",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                                ]
                            }
                        },
                        {
                            $project: {
                                nombre: 1
                            }
                        }
                    ],
                    as: "horario",
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
                    usuario: { $arrayElemAt: ["$usuario", 0] },
                    horario: { $arrayElemAt: ["$horario", 0] },
                    creado_por: { $arrayElemAt: ["$creado_por", 0] },
                    modificado_por: { $arrayElemAt: ["$modificado_por", 0] },
                },
            },
            {
                $set: {
                    usuario: "$usuario.nombre",
                    horario: "$horario.nombre",
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                },
            },
            {
                $match: {
                    $or: [
                        { usuario: { $exists: true } },
                        { horario: { $exists: true } }
                    ]
                }
            },
            {
                $project: {
                    horario: 1,
                    usuario: 1,
                    periodo: 1,
                    esIndeterminado: 1,
                    fecha_creacion: 1,
                    creado_por: 1,
                    modificado_por: 1,
                    fecha_modificacion: 1,
                    activo: 1,
                },
            },
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Asignación no encontrada." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevaAsignacion(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario

        const usuarios = await Usuarios.find(
            {
                $and: [
                    isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) },
                    { activo: true },
                ],
                $or: [
                    { id_horario: { $exists: false } },
                    { id_horario: { $eq: null } },
                ],
            },
            {
                nombre: {
                    $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                },
            }
        );
        const horarios = await Horarios.find({ activo: true }, "nombre");
        res.status(200).json({ estado: true, datos: { horarios, usuarios } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormEditarAsignacion(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario

        const asignacion = await Asignaciones.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                        isMaster ? { activo: true } : { id_empresa: new Types.ObjectId(id_empresa), activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuario",
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
                    usuario: { $arrayElemAt: ["$usuario", 0] },
                },
            },
            {
                $set: {
                    usuario: "$usuario.nombre",
                },
            },
            {
                $project: {
                    usuario: 1,
                    id_horario: 1,
                    esIndeterminado: 1,
                    periodo: 1
                }
            }
        ]);
        if (!asignacion[0]) {
            res.status(200).json({ estado: false, mensaje: "Asignación no encontrada." });
            return;
        }

        const horarios = await Horarios.find({ activo: true }, "nombre");
        res.status(200).json({ estado: true, datos: { asignacion: asignacion[0], horarios } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { id_horario, usuarios, esIndeterminado, periodo } = req.body;
        const id_usuario = (req as UserRequest).userId;

        let detectoErrores = false;
        const registros = [];
        let mensajes: any;
        for await (const usuario of usuarios) {
            const nuevoRegistro = new Asignaciones({
                id_horario,
                id_usuario: usuario._id,
                esIndeterminado,
                periodo: esIndeterminado ? {} : periodo,
                creado_por: id_usuario
            });
            mensajes = await validarModelo(nuevoRegistro);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...usuario, errores: mensajes.id_usuario });
                continue;
            }
            registros.push({ ...usuario });

        }
        detectoErrores = registros.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(400).send({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.',
                mensajes: { usuarios: "Hay un error con uno de los usuarios." },
                datos: registros
            });
            return;
        }

        for await (const usuario of usuarios) {
            const nuevoRegistro = new Asignaciones({
                id_horario,
                id_usuario: usuario._id,
                esIndeterminado,
                periodo: esIndeterminado ? {} : periodo,
                creado_por: id_usuario
            });
            await nuevoRegistro.save();
            await Usuarios.findByIdAndUpdate(usuario._id, { $set: { id_horario } });
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { id_horario, esIndeterminado, periodo } = req.body;
        const id_usuario = (req as UserRequest).userId;

        const registro = await Asignaciones.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    id_horario,
                    esIndeterminado,
                    periodo: esIndeterminado ? {} : periodo,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                }
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
            res.status(200).json({ estado: false, mensaje: 'Asignación no encontrada.' });
            return;
        }
        await Usuarios.findByIdAndUpdate(registro.id_usuario, { $set: { id_horario } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const resultado = await Asignaciones.findByIdAndUpdate(req.params.id, {
            $set: { activo: !req.body.activo },
        });

        if (resultado) {
            const { id_usuario, id_horario } = resultado;
            if (req.body.activo) {
                await Usuarios.findByIdAndUpdate(id_usuario, { $set: { id_horario: null } });
            } else {
                await Usuarios.findByIdAndUpdate(id_usuario, { $set: { id_horario } });
            }
            res.status(200).json({ estado: true });
        } else {
            res.status(200).json({ estado: false, mensaje: "Asignación no encontrada." });
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}