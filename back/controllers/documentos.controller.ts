import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import dayjs from "dayjs";
import { UserRequest } from '../types/express';
import { QueryParams } from "../types/queryparams";
import Usuarios, { IUsuario } from '../models/Usuarios';
import Documentos from "../models/Documentos";
import TiposDocumentos from "../models/TiposDocumentos";
import Visitantes from "../models/Visitantes";
import { fecha, log } from "../middlewares/log";
import { consultarDocumentacion, customAggregationForDataGrids, isEmptyObject, resizeImage } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import Registros from "../models/Registros";
import { enviarCorreoDocumentoRechazada } from "../utils/correos";
import Empresas from "../models/Empresas";

export async function obtenerTodosReportes(req: Request, res: Response): Promise<void> {
    try {
        const { visitantes, tipo, estatus, usuarios, fecha_inicio, fecha_final } = req.body.datos;
        const entrada = dayjs(fecha_inicio).toDate();
        const salida = dayjs(fecha_final).toDate();

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
            ["usuario", "empresa", "tipo", "estatus"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        tipo.length > 0 ? { tipo: { $in: tipo.map((item: string) => Number(item)) } } : {},
                        estatus.length > 0 ? { estatus: { $in: estatus.map((item: string) => Number(item)) } } : {},
                        visitantes.length > 0 ? { creado_por: { $in: visitantes.map((item: string) => new Types.ObjectId(item)) } } : {},
                        usuarios.length > 0 ? { validado_por: { $in: usuarios.map((item: string) => new Types.ObjectId(item)) } } : {},
                        (fecha_inicio && fecha_final) ? { fecha_creacion: { $gte: entrada, $lt: salida } } : {},
                    ]
                }
            },
            {
                $lookup: {
                    from: 'visitantes',
                    localField: 'creado_por',
                    foreignField: '_id',
                    as: 'visitante',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                },
                                empresa: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'validado_por',
                    foreignField: '_id',
                    as: 'validado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    visitante: { $arrayElemAt: ['$visitante', -1] },
                    validado_por: { $arrayElemAt: ['$validado_por', -1] },
                }
            },
            {
                $set: {
                    visitante: "$visitante.nombre",
                    validado_por: "$validado_por.nombre"
                }
            },
            {
                $project: {
                    visitante: 1,
                    tipo: 1,
                    estatus: 1,
                    validado_por: 1,
                    fecha_creacion: 1,
                    fecha_modificacion: 1,
                    activo: 1,
                    fecha_entrada: 1,
                    fecha_salida: 1,
                    tiempo_expiracion: 1
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
                $sort: sortMDB ?
                    sortMDB : {
                        fecha_creacion: -1,
                        estatus: 1
                    }
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
        const registros = await Documentos.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosPorUsuario(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
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
            ["usuario", "tipo", "estatus", "validado_por", "fecha_creacion"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    creado_por: new Types.ObjectId(id_usuario)
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'modificado_por',
                    foreignField: '_id',
                    as: 'modificado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'validado_por',
                    foreignField: '_id',
                    as: 'validado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    modificado_por: { $arrayElemAt: ['$modificado_por', -1] },
                    validado_por: { $arrayElemAt: ['$validado_por', -1] },
                }
            },
            {
                $set: {
                    modificado_por: "$modificado_por.nombre",
                    validado_por: "$validado_por.nombre"
                }
            },
            {
                $project: {
                    tipo: 1,
                    estatus: 1,
                    validado_por: 1,
                    fecha_creacion: 1,
                    activo: 1,
                    fecha_entrada: 1,
                    fecha_salida: 1,
                    tiempo_expiracion: 1
                }
            },
            {
                $sort: {
                    fecha_creacion: -1,
                }
            }
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
                $sort: sortMDB ?
                    sortMDB : {
                        fecha_creacion: -1,
                        estatus: 1
                    }
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
        const documentos = await Documentos.aggregate(aggregation)
        res.status(200).send({ estado: true, datos: documentos[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Documentos.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(req.params.id),
                },
            },
            {
                $lookup: {
                    from: 'visitantes',
                    localField: 'creado_por',
                    foreignField: '_id',
                    as: 'creado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre:
                                {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'modificado_por',
                    foreignField: '_id',
                    as: 'modificado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'validado_por',
                    foreignField: '_id',
                    as: 'validado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    creado_por: { $arrayElemAt: ['$creado_por', -1] },
                    modificado_por: { $arrayElemAt: ['$modificado_por', -1] },
                    validado_por: { $arrayElemAt: ['$validado_por', -1] },
                }
            },
            {
                $set: {
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                    validado_por: "$validado_por.nombre"
                }
            }
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Documento no encontrado" });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevoDocumento(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const documentos_empresas = (await Empresas.find({ activo: true }, 'documentos')).map((item) => item.documentos).flat();
        const documentos_validos = await consultarDocumentacion(id_usuario);
        const documentos_faltantes = documentos_empresas.filter((item) => !documentos_validos.some((doc) => doc.tipo === item));
        const tipos_documentos = await TiposDocumentos.find(
            { tipo: { $in: documentos_faltantes }, activo: true },
            { tipo: 1, nombre: 1, extensiones: 1 }
        );
        res.status(200).json({ estado: true, datos: { tipos_documentos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarDocumento(req: Request, res: Response): Promise<void> {
    try {
        const documento = await Documentos.findById(req.params.id, "tipo estatus documento imagenes tiempo_indefinido fecha_entrada fecha_salida motivo");
        res.status(200).json({ estado: true, datos: { documento } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUnoSolodocumento(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Documentos.findById(req.params.id, 'tipo documento imagenes');
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Documento no encontrado.' });
            return;
        }
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { tipo, documento, imagenes } = req.body;
        const tipo_doc = await TiposDocumentos.findOne({ tipo }, 'nombre extensione');
        if (!tipo_doc) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { tipo: "Este campo es obligatorio." } });
            return;
        }
        if (tipo_doc.extensiones?.some((item) => item === "pdf" && !documento)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { documento: "Este campo es obligatorio." } });
            return;
        }
        if (tipo_doc.extensiones?.some((item) => item === "webp" && !imagenes[0] && !imagenes[1])) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { imagenes: "Las identificaciones son obligatorias." } });
            return;
        }
        let documentos = await Documentos.countDocuments({ tipo, creado_por: id_usuario, activo: true, estatus: 1 });
        if (documentos !== 0) {
            res.status(200).json({ estado: false, mensaje: `Tienes un documento: ${tipo_doc?.nombre} en proceso de validación.` })
            return;
        }
        documentos = await Documentos.countDocuments({ tipo, creado_por: id_usuario, activo: true, estatus: true });
        if (documentos >= 2) {
            res.status(200).json({ estado: false, mensaje: `Superaste el límte de documentos "${tipo_doc?.nombre}" activos.` })
            return;
        }
        const nuevoRegistro = new Documentos({
            tipo,
            documento,
            imagenes,
            creado_por: id_usuario,
        });
        const mensajes = await validarModelo(nuevoRegistro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        await nuevoRegistro.save();
        res.status(200).json({ estado: true, mensaje: 'El documento se está procesando, podría demorar un poco para aparecer en tus documentos' });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { tipo, fecha_entrada: entrada, fecha_salida: salida, tiempo_indefinido, estatus, motivo, enviar_correo } = req.body;
        const fecha_entrada = dayjs(entrada);
        const fecha_salida = dayjs(salida);
        if (!tiempo_indefinido && (fecha_entrada.isAfter(fecha_salida))) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { fecha_entrada: "La fecha de entrada no puede ser mayor a la fecha de salida." } });
            return;
        }
        const doc = await Documentos.findByIdAndUpdate(req.params.id, {
            tipo,
            fecha_entrada: fecha_entrada.toDate(),
            fecha_salida: fecha_salida.toDate(),
            estatus,
            motivo,
            tiempo_indefinido,
            fecha_validacion: Date.now(),
            validado_por: id_usuario,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
            activo: ![2].includes(estatus)
        });
        if (!doc) {
            res.status(200).json({ estado: false, mensaje: 'Documento no encontrado.' });
            return;
        }
        const visitante = await Visitantes.findOne(doc.creado_por, 'correo');
        if (!visitante) {
            res.status(200).json({ estado: false, mensaje: 'Documento no encontrado.' });
            return;
        }
        if (![2, 3].includes(estatus)) {
            res.status(200).json({ estado: false, mensaje: 'No se esta aceptando o rechazando el documento.' });
            return;
        }
        if (estatus == 3) {
            const registrosConDocs = await consultarRegistrosDocsTipo(visitante.correo, [Number(tipo)]);
            for await (const registro of registrosConDocs) {
                await Registros.updateOne({ _id: registro }, { $pull: { documentos: doc._id } });
            }
            const registrosSinDocs = await consultarRegistrosSinDocs(visitante.correo);
            for await (const registro of registrosSinDocs) {
                const busqueda = tiempo_indefinido ? { _id: registro, activo: true } : { _id: registro, activo: true, fecha_entrada: { $gte: fecha_entrada.toDate(), $lte: fecha_salida.toDate() } };
                await Registros.updateOne(busqueda, { $push: { documentos: doc._id } });
            }
            res.status(200).json({ estado: true });
            return
        }
        else {
            const registrosConDocs = await consultarRegistrosDocsTipo(visitante.correo, [Number(tipo)]);
            for await (const registro of registrosConDocs) {
                await Registros.updateOne({ _id: registro }, { $pull: { documentos: doc._id } });
            }
            const tipo_documento = await TiposDocumentos.findOne({ tipo }, "nombre");
            let correoEnviado = false;
            if (enviar_correo) {
                correoEnviado = await enviarCorreoDocumentoRechazada({ correo: visitante.correo, tipo_documento: tipo_documento?.nombre || "No especificado", fecha_carga: dayjs(doc.fecha_creacion).format("DD/MM/YYYY, HH:mm:ss a"), motivo })
            }
            res.status(200).json({ estado: true, datos: { correo_enviado: correoEnviado } });
            return;
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

type RegistrosDocs = {
    _id: Types.ObjectId;
    documentos: number[];
    documentos_requeridos: number[];
}

const consultarRegistrosSinDocs = async (correo: string): Promise<Types.ObjectId[]> => {
    try {
        const registros: RegistrosDocs[] = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { correo: correo, activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'id_anfitrion',
                    foreignField: '_id',
                    as: 'anfitrion',
                    pipeline: [
                        {
                            $lookup: {
                                from: 'empresas',
                                localField: 'id_empresa',
                                foreignField: '_id',
                                as: 'empresa',
                                pipeline: [
                                    {
                                        $project: {
                                            documentos: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $set: {
                                empresa: { $arrayElemAt: ["$empresa", -1] }
                            }
                        },
                        {
                            $set: {
                                documentos_requeridos: "$empresa.documentos"
                            }
                        },
                        {
                            $project: {
                                documentos_requeridos: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'documentos',
                    localField: 'documentos',
                    foreignField: '_id',
                    as: 'documentos',
                    pipeline: [
                        {
                            $match: {
                                activo: true,
                                estatus: 3,
                            }
                        },
                        {
                            $project: {
                                tipo: 1
                            }
                        },
                        {
                            $sort: {
                                tipo: 1,
                                fecha_modfiicacion: -1
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    anfitrion: { $arrayElemAt: ["$anfitrion", -1] }
                }
            },
            {
                $set: {
                    documentos_requeridos: "$anfitrion.documentos_requeridos"
                }
            },
            {
                $addFields: {
                    documentos: {
                        $map: {
                            input: "$documentos",
                            as: "item",
                            in: "$$item.tipo"
                        }
                    }
                }
            },
            {
                $project: {
                    documentos: 1,
                    documentos_requeridos: 1
                }
            }
        ]);
        const registrosSinDocReq = registros
            .filter(({ documentos, documentos_requeridos }) => {
                return documentos_requeridos.some((item) => !documentos.includes(item));
            });
        const validateDocs = registrosSinDocReq.map((item) => item._id);
        return validateDocs;
    } catch (error: any) {
        throw error;
    }
}

const consultarRegistrosDocsTipo = async (correo: string, tipo: number[]): Promise<Types.ObjectId[]> => {
    try {
        const registros: RegistrosDocs[] = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { correo: correo, activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'documentos',
                    localField: 'documentos',
                    foreignField: '_id',
                    as: 'documentos',
                    pipeline: [
                        {
                            $match: { tipo: { $in: tipo } }
                        },
                        {
                            $project: {
                                tipo: 1
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    documentos_size: { $size: "$documentos" }
                }
            },
            { $match: { documentos_size: { $gt: 0 } } },
            {
                $addFields: {
                    documentos: {
                        $map: {
                            input: "$documentos",
                            as: "item",
                            in: "$$item.tipo"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                }
            }
        ]);
        const validateDocs = registros.map((item) => item._id);
        return validateDocs;
    } catch (error: any) {
        throw error;
    }
}