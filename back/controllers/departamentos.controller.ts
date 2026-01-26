import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import { UserRequest } from '../types/express';
import { QueryParams } from "../types/queryparams";
import Departamentos from '../models/Departamentos';
import Usuarios, { IUsuario } from '../models/Usuarios';
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject, resizeImage } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import Empresas from "../models/Empresas";

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
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
            ["identificador","nombre"]
        );
        const aggregation: PipelineStage[] = [
            {
                $project: {
                    nombre: 1,
                    identificador: 1,
                    empresas: { $size: "$empresas" },
                    esRoot: 1,
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
                $sort: sortMDB ? sortMDB : { esRoot: -1 }
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
        const registros = await Departamentos.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        console.log(error)
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const departamentos = await Departamentos.find(isMaster ? {} : { _id: id_empresa }, 'nombre departamentos activo').sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: departamentos });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Departamentos.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(req.params.id),
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
                    localField: "empresas",
                    foreignField: "_id",
                    as: "empresas",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                rfc: 1
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    creado_por: { $arrayElemAt: ["$creado_por", 0] },
                    modificado_por: { $arrayElemAt: ["$modificado_por", 0] },
                },
            },
            {
                $set: {
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                },
            },
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Departamento no encontrado" });
            return;
        }
        const empresas = await Empresas.find({ departamentos: { $in: [registro[0]._id] } }, 'rfc nombre');
        res.status(200).json({ estado: true, datos: { ...registro[0], empresas } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, identificador } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const registro = new Departamentos({
            nombre,
            identificador,
            creado_por: id_usuario
        });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        await registro.save();
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, identificador } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const registro = await Departamentos.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    nombre,
                    identificador,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now()
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
            res.status(200).json({ estado: false, mensaje: 'Departamento no encontrado' });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const { activo } = req.body;
        const validar_registro = await Usuarios.findOne({ id_departamento: req.params.id });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'El departamento está asignado a uno o más usuarios.' });
            return;
        }
        const registro = await Departamentos.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Departamento no encontrado.' });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}