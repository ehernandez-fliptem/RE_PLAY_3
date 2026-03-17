import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import bcrypt from "bcrypt";
import { UserRequest } from "../types/express";
import { QueryParams } from "../types/queryparams";
import Contratistas from "../models/Contratistas";
import ContratistaVisitantes from "../models/ContratistaVisitantes";
import ContratistaSolicitudes from "../models/ContratistaSolicitudes";
import Visitantes from "../models/Visitantes";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, generarCodigoUnico, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";

const obtenerContratistaDeUsuario = async (id_usuario: string) => {
    return Contratistas.findOne({ id_usuario, activo: true });
};

export async function crearSolicitud(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await Contratistas.findById(req.body?.id_contratista);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const { fecha_visita, comentario, visitantes } = req.body as {
            fecha_visita: string;
            comentario?: string;
            visitantes: string[];
        };
        if (!fecha_visita || !Array.isArray(visitantes) || visitantes.length === 0) {
            res.status(200).json({ estado: false, mensaje: "Faltan datos para crear la solicitud." });
            return;
        }

        const visitantesIds = visitantes.map((id) => new Types.ObjectId(id));
        const visitantesValidos = await ContratistaVisitantes.find({
            _id: { $in: visitantesIds },
            id_contratista: contratista._id,
            activo: true,
        }).lean();
        if (visitantesValidos.length === 0) {
            res.status(200).json({ estado: false, mensaje: "No hay visitantes válidos para la solicitud." });
            return;
        }

        const items = visitantesValidos.map((v) => ({
            id_visitante: v._id,
            estado: 1,
            motivo: "",
        }));

        const nuevaSolicitud = new ContratistaSolicitudes({
            id_contratista: contratista._id,
            id_empresa: contratista.id_empresa,
            fecha_visita: new Date(fecha_visita),
            comentario,
            estado: 1,
            items,
            enviado_por: id_usuario,
            creado_por: id_usuario,
        });

        const mensajes = await validarModelo(nuevaSolicitud);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: "Revisa los datos de la solicitud.", mensajes });
            return;
        }

        await nuevaSolicitud.save();
        res.status(200).json({ estado: true, datos: nuevaSolicitud });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerSolicitudesContratista(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : ((req.query?.contratista ? await Contratistas.findById(String(req.query.contratista)) : null));
        if (role.includes(11) && !contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
            customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["comentario"]);

        const aggregation: PipelineStage[] = [
            { $match: contratista ? { id_contratista: contratista._id } : {} },
            {
                $project: {
                    fecha_visita: 1,
                    comentario: 1,
                    estado: 1,
                    items: 1,
                    fecha_creacion: 1,
                },
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({ $match: { $or: filterMDB } });
        }
        aggregation.push(
            { $sort: sortMDB ? sortMDB : { fecha_creacion: -1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [{ $count: "count" }],
                },
            }
        );

        const registros = await ContratistaSolicitudes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerPendientes(req: Request, res: Response): Promise<void> {
    try {
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
            customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["comentario"]);

        const aggregation: PipelineStage[] = [
            { $match: { estado: 1 } },
            {
                $lookup: {
                    from: "contratistas",
                    localField: "id_contratista",
                    foreignField: "_id",
                    as: "contratista",
                    pipeline: [{ $project: { empresa: 1 } }],
                },
            },
            { $set: { contratista: { $arrayElemAt: ["$contratista", 0] } } },
            {
                $project: {
                    fecha_visita: 1,
                    comentario: 1,
                    estado: 1,
                    items: 1,
                    fecha_creacion: 1,
                    empresa: "$contratista.empresa",
                },
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({ $match: { $or: filterMDB } });
        }
        aggregation.push(
            { $sort: sortMDB ? sortMDB : { fecha_creacion: -1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [{ $count: "count" }],
                },
            }
        );

        const registros = await ContratistaSolicitudes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerSolicitud(req: Request, res: Response): Promise<void> {
    try {
        const role = (req as UserRequest).role || [];
        const registro = await ContratistaSolicitudes.findById(req.params.id).lean();
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Solicitud no encontrada." });
            return;
        }
        if (role.includes(11)) {
            const id_usuario = (req as UserRequest).userId;
            const contratista = await obtenerContratistaDeUsuario(String(id_usuario));
            if (!contratista || String(contratista._id) !== String(registro.id_contratista)) {
                res.status(401).json({ estado: false, mensaje: "No autorizado." });
                return;
            }
        }
        const visitantesIds = registro.items.map((i) => new Types.ObjectId(i.id_visitante));
        const visitantes = await ContratistaVisitantes.find({ _id: { $in: visitantesIds } }).lean();
        res.status(200).json({ estado: true, datos: { ...registro, visitantes } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function revisarSolicitud(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { items } = req.body as { items: { id_visitante: string; estado: number; motivo?: string }[] };
        const solicitud = await ContratistaSolicitudes.findById(req.params.id);
        if (!solicitud) {
            res.status(200).json({ estado: false, mensaje: "Solicitud no encontrada." });
            return;
        }
        if (!Array.isArray(items) || items.length === 0) {
            res.status(200).json({ estado: false, mensaje: "No hay items para revisar." });
            return;
        }

        const itemsMap = new Map(items.map((i) => [String(i.id_visitante), i]));
        const actualizados = solicitud.items.map((item) => {
            const incoming = itemsMap.get(String(item.id_visitante));
            if (!incoming) return item;
            return {
                ...item,
                estado: incoming.estado,
                motivo: incoming.motivo || "",
            };
        });
        solicitud.items = actualizados as any;

        const estados = actualizados.map((i) => i.estado);
        let estadoSolicitud = 1;
        if (estados.every((e) => e === 2)) estadoSolicitud = 2;
        else if (estados.every((e) => e === 3)) estadoSolicitud = 3;
        else if (estados.some((e) => e === 2) && estados.some((e) => e === 3)) estadoSolicitud = 4;

        solicitud.estado = estadoSolicitud;
        solicitud.revisado_por = id_usuario as any;
        solicitud.fecha_revision = new Date();
        solicitud.fecha_modificacion = new Date();
        solicitud.modificado_por = id_usuario as any;

        await solicitud.save();

        for await (const item of actualizados) {
            const visitante = await ContratistaVisitantes.findById(item.id_visitante);
            if (!visitante) continue;
            if (item.estado === 2) {
                visitante.estado_validacion = 2;
                visitante.motivo_rechazo = "";
                visitante.fecha_validacion = new Date();
                visitante.validado_por = id_usuario as any;
                visitante.hash_ultimo_aprobado = visitante.hash_datos || "";

                // Crear o actualizar visitante en RE
                if (!visitante.id_visitante_re) {
                    const existente = await Visitantes.findOne(
                        { correo: String(visitante.correo).trim().toLowerCase() },
                        "_id"
                    ).lean();
                    if (existente) {
                        visitante.id_visitante_re = existente._id as any;
                        await Visitantes.findByIdAndUpdate(existente._id, {
                            $set: {
                                nombre: visitante.nombre,
                                apellido_pat: visitante.apellido_pat,
                                apellido_mat: visitante.apellido_mat,
                                telefono: visitante.telefono,
                                empresa: visitante.empresa,
                                verificado: true,
                            },
                        });
                    } else {
                        const contrasena = generarCodigoUnico(10, true);
                        const hash = bcrypt.hashSync(contrasena, 10);
                        const nuevoVisitante = new Visitantes({
                            nombre: visitante.nombre,
                            apellido_pat: visitante.apellido_pat,
                            apellido_mat: visitante.apellido_mat,
                            correo: visitante.correo,
                            telefono: visitante.telefono,
                            empresa: visitante.empresa,
                            contrasena: hash,
                            rol: [10],
                            verificado: true,
                        });
                        await nuevoVisitante.save();
                        visitante.id_visitante_re = nuevoVisitante._id;
                    }
                } else {
                    await Visitantes.findByIdAndUpdate(visitante.id_visitante_re, {
                        $set: {
                            nombre: visitante.nombre,
                            apellido_pat: visitante.apellido_pat,
                            apellido_mat: visitante.apellido_mat,
                            correo: visitante.correo,
                            telefono: visitante.telefono,
                            empresa: visitante.empresa,
                            verificado: true,
                        },
                    });
                }
            }
            if (item.estado === 3) {
                visitante.estado_validacion = 3;
                visitante.motivo_rechazo = item.motivo || "";
                visitante.fecha_validacion = new Date();
                visitante.validado_por = id_usuario as any;
            }
            await visitante.save();
        }

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
