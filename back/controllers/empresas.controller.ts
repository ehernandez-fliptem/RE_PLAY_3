import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import { UserRequest } from '../types/express';
import { QueryParams } from "../types/queryparams";
import Empresas, { IContacto } from '../models/Empresas';
import Usuarios, { IUsuario } from '../models/Usuarios';
import Pisos from '../models/Pisos';
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject, resizeImage } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import Accesos from "../models/Accesos";
import Puestos from "../models/Puestos";
import Cubiculos from "../models/Cubiculos";
import Departamentos from "../models/Departamentos";

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
            ["nombre", "rfc"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        isMaster ? {} : { _id: id_empresa }
                    ]
                }
            },
            {
                $project: {
                    nombre: 1,
                    rfc: 1,
                    pisos: 1,
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
        const registros = await Empresas.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const empresas = await Empresas.find(isMaster ? {} : { _id: id_empresa }, 'nombre pisos activo').sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: empresas });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Empresas.aggregate([
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
                    from: "pisos",
                    localField: "pisos",
                    foreignField: "_id",
                    as: "pisos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos",
                    foreignField: "_id",
                    as: "accesos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "puestos",
                    localField: "puestos",
                    foreignField: "_id",
                    as: "puestos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "cubiculos",
                    localField: "cubiculos",
                    foreignField: "_id",
                    as: "cubiculos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "departamentos",
                    localField: "departamentos",
                    foreignField: "_id",
                    as: "departamentos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
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
            res.status(200).json({ estado: false, mensaje: "Empresa no encontrada" });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevoEmpresa(_req: Request, res: Response): Promise<void> {
    try {
        const pisos = await Pisos.find({ activo: true }, 'identificador nombre');
        const accesos = await Accesos.find({ activo: true }, 'identificador nombre');
        const puestos = await Puestos.find({ activo: true }, 'identificador nombre');
        const cubiculos = await Cubiculos.find({ activo: true }, 'identificador nombre');
        const departamentos = await Departamentos.find({ activo: true }, 'identificador nombre');
        res.status(200).json({ estado: true, datos: { pisos, accesos, puestos, departamentos, cubiculos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarEmpresa(req: Request, res: Response): Promise<void> {
    try {
        const empresa = await Empresas.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                    ]
                }
            },
            {
                $project: {
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                    activo: 0,
                }
            }
        ]);
        if (!empresa[0]) {
            res.status(200).json({ estado: false, mensaje: 'Empresa no encontrada.' });
            return;
        }
        const pisos = await Pisos.find({ activo: true }, 'identificador nombre');
        const accesos = await Accesos.find({ activo: true }, 'identificador nombre');
        const puestos = await Puestos.find({ activo: true }, 'identificador nombre');
        const cubiculos = await Cubiculos.find({ activo: true }, 'identificador nombre');
        const departamentos = await Departamentos.find({ activo: true }, 'identificador nombre');
        res.status(200).json({ estado: true, datos: { empresa: empresa[0], pisos, accesos, puestos, cubiculos, departamentos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function crear(req: Request, res: Response): Promise<void> {
    
    try {
        const { img_empresa, nombre, rfc, telefonos, pisos, accesos, puestos, departamentos, cubiculos, documentos } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const telefonosFormatter = telefonos.map((item: IContacto) => { return { _id: new Types.ObjectId(), numero: item.numero, extension: item.extension } });
        const registro = new Empresas({
            img_empresa: await resizeImage(img_empresa),
            nombre,
            rfc,
            telefonos: telefonosFormatter,
            pisos,
            accesos,
            puestos,
            departamentos,
            cubiculos,
            documentos,
            creado_por: id_usuario
        });
        
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        await registro.save();
        if (pisos && Array.isArray(pisos)) {
            await Pisos.updateMany(
                { _id: { $in: pisos } },
                { $addToSet: { empresas: registro._id } }
            );
        }
        if (accesos && Array.isArray(accesos)) {
            await Accesos.updateMany(
                { _id: { $in: accesos } },
                { $addToSet: { empresas: registro._id } }
            );
        }
        if (puestos && Array.isArray(puestos)) {
            await Puestos.updateMany(
                { _id: { $in: puestos } },
                { $addToSet: { empresas: registro._id } }
            );
        }
        if (departamentos && Array.isArray(departamentos)) {
            await Departamentos.updateMany(
                { _id: { $in: departamentos } },
                { $addToSet: { empresas: registro._id } }
            );
        }
        if (cubiculos && Array.isArray(cubiculos)) {
            await Cubiculos.updateMany(
                { _id: { $in: cubiculos } },
                { $addToSet: { empresas: registro._id } }
            );
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { img_empresa, nombre, rfc, telefonos, pisos, accesos, puestos, departamentos, cubiculos, documentos } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const telefonosFormatter = telefonos.map((item: IContacto) => { return { _id: new Types.ObjectId(), numero: item.numero, extension: item.extension } });
        const registro = await Empresas.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    img_empresa: await resizeImage(img_empresa),
                    nombre,
                    rfc,
                    telefonos: telefonosFormatter,
                    pisos,
                    accesos,
                    puestos,
                    departamentos,
                    cubiculos,
                    documentos,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now()
                }
            },
            { runValidators: true, projection: { pisos: 1, accesos: 1, puestos: 1, departamentos: 1, cubiculos: 1 } })
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
            res.status(200).json({ estado: false, mensaje: 'Empresa no encontrada.' });
            return;
        }
        // Sincronizar Pisos:
        const pisosPrevios = registro.pisos.map(p => p.toString());
        const pisosNuevos = pisos.map((p: any) => p.toString());
        const pisosEliminados = pisosPrevios.filter(p => !pisosNuevos.includes(p));
        const pisosAgregados = pisosNuevos.filter((p: string) => !pisosPrevios.includes(p));

        if (pisosEliminados.length > 0) {
            await Pisos.updateMany(
                { _id: { $in: pisosEliminados } },
                { $pull: { empresas: req.params.id } }
            );
        }
        if (pisosAgregados.length > 0) {
            await Pisos.updateMany(
                { _id: { $in: pisosAgregados } },
                { $addToSet: { empresas: req.params.id } }
            );
        }
        // Sincronizar Accesos:
        const accesosPrevios = registro.accesos.map(a => a.toString());
        const accesosNuevos = accesos.map((a: any) => a.toString());
        const accesosEliminados = accesosPrevios.filter(a => !accesosNuevos.includes(a));
        const accesosAgregados = accesosNuevos.filter((a: string) => !accesosPrevios.includes(a));

        if (accesosEliminados.length > 0) {
            await Accesos.updateMany(
                { _id: { $in: accesosEliminados } },
                { $pull: { empresas: req.params.id } }
            );
        }
        if (accesosAgregados.length > 0) {
            await Accesos.updateMany(
                { _id: { $in: accesosAgregados } },
                { $addToSet: { empresas: req.params.id } }
            );
        }
        // Sincronizar Puestos:
        const puestosPrevios = (registro.puestos ?? []).map((p: Types.ObjectId) => p.toString());
        const puestosNuevos = puestos.map((a: any) => a.toString());
        const puestosEliminados = puestosPrevios.filter(a => !puestosNuevos.includes(a));
        const puestosAgregados = puestosNuevos.filter((a: string) => !puestosPrevios.includes(a));

        if (puestosEliminados.length > 0) {
            await Puestos.updateMany(
                { _id: { $in: puestosEliminados } },
                { $pull: { empresas: req.params.id } }
            );
        }
        if (puestosAgregados.length > 0) {
            await Puestos.updateMany(
                { _id: { $in: puestosAgregados } },
                { $addToSet: { empresas: req.params.id } }
            );
        }
        // Sincronizar Departamentos:
        const departamentosPrevios = (registro.departamentos?? []).map((p: Types.ObjectId) => p.toString());
        const departamentosNuevos = departamentos.map((a: any) => a.toString());
        const departamentosEliminados = departamentosPrevios.filter(a => !departamentosNuevos.includes(a));
        const departamentosAgregados = departamentosNuevos.filter((a: string) => !departamentosPrevios.includes(a));

        if (departamentosEliminados.length > 0) {
            await Departamentos.updateMany(
                { _id: { $in: departamentosEliminados } },
                { $pull: { empresas: req.params.id } }
            );
        }
        if (departamentosAgregados.length > 0) {
            await Departamentos.updateMany(
                { _id: { $in: departamentosAgregados } },
                { $addToSet: { empresas: req.params.id } }
            );
        }
        // Sincronizar Cubiculos:
        const cubiculosPrevios = (registro.cubiculos?? []).map((p: Types.ObjectId) => p.toString());
        const cubiculosNuevos = cubiculos.map((a: any) => a.toString());
        const cubiculosEliminados = cubiculosPrevios.filter(a => !cubiculosNuevos.includes(a));
        const cubiculosAgregados = cubiculosNuevos.filter((a: string) => !cubiculosPrevios.includes(a));

        if (cubiculosEliminados.length > 0) {
            await Cubiculos.updateMany(
                { _id: { $in: cubiculosEliminados } },
                { $pull: { empresas: req.params.id } }
            );
        }
        if (cubiculosAgregados.length > 0) {
            await Cubiculos.updateMany(
                { _id: { $in: cubiculosAgregados } },
                { $addToSet: { empresas: req.params.id } }
            );
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
        let validar_registro = await Empresas.findOne({ _id: req.params.id, esRoot: true });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'No puedes eliminar la empresa maestra.' });
            return;
        }
        validar_registro = await Empresas.findOne({ _id: req.params.id, "accesos.0": { $exists: true } });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'La empresa aún tiene accesos asignados, debe eliminarlos antes de continuar.' });
            return;
        }
        const registro = await Empresas.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Empresa no encontrada.' });
            return;
        }
        if (req.body.activo) {
            const empresas = await Empresas.updateMany({ empresa: req.params.id }, { $set: { activo: !req.body.activo } });
            res.status(200).json({ estado: true, datos: empresas.modifiedCount });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}