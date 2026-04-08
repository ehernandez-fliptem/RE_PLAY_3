import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import bcrypt from "bcrypt";
import { UserRequest } from "../types/express";
import { QueryParams } from "../types/queryparams";
import Contratistas from "../models/Contratistas";
import ContratistaVisitantes from "../models/ContratistaVisitantes";
import ContratistaSolicitudes from "../models/ContratistaSolicitudes";
import Visitantes from "../models/Visitantes";
import Empleados from "../models/Empleados";
import Usuarios from "../models/Usuarios";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, generarCodigoUnico, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import {
    enviarCorreoAnfitrionSolicitudAprobada,
    enviarCorreoContratistaSolicitudCreada,
    enviarCorreoContratistaSolicitudResultado,
} from "../utils/correos";

const obtenerContratistaDeUsuario = async (id_usuario: string) => {
    return Contratistas.findOne({ id_usuario, activo: true });
};

const normalizarCorreo = (correo?: string) => String(correo || "").trim().toLowerCase();

const construirNombreCompleto = (registro: {
    nombre?: string;
    apellido_pat?: string;
    apellido_mat?: string;
}) => [registro.nombre || "", registro.apellido_pat || "", registro.apellido_mat || ""]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const obtenerCorreosNotificacionContratista = async (contratista: {
    id_usuario?: Types.ObjectId;
    correos?: string[];
}) => {
    const emails = new Set<string>();
    (contratista.correos || [])
        .map((correo) => normalizarCorreo(correo))
        .filter(Boolean)
        .forEach((correo) => emails.add(correo));

    if (contratista.id_usuario) {
        const usuario = await Usuarios.findById(contratista.id_usuario, { correo: 1 }).lean();
        const correoUsuario = normalizarCorreo((usuario as any)?.correo);
        if (correoUsuario) emails.add(correoUsuario);
    }
    return [...emails];
};

const enviarCorreoSeguro = async (handler: () => Promise<boolean>, contexto: string) => {
    try {
        const ok = await handler();
        if (!ok) {
            log(`${fecha()} WARN: No se pudo enviar correo (${contexto}).\n`);
        }
    } catch (error: any) {
        log(`${fecha()} WARN: Error enviando correo (${contexto}): ${error?.message || error}\n`);
    }
};

const inicioHoy = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
};

const inicioManana = () => {
    const manana = inicioHoy();
    manana.setDate(manana.getDate() + 1);
    return manana;
};

const rangoDia = (fecha: Date) => {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
};

const normalizarRangoFechas = (desde?: string, hasta?: string) => {
    const inicio = desde ? new Date(desde) : null;
    const fin = hasta ? new Date(hasta) : null;
    if (inicio && Number.isNaN(inicio.getTime())) return null;
    if (fin && Number.isNaN(fin.getTime())) return null;
    if (inicio) inicio.setHours(0, 0, 0, 0);
    if (fin) fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
};

const marcarSolicitudesVencidas = async (filtro: { id_contratista?: Types.ObjectId } = {}) => {
    const hoy = inicioHoy();
    await ContratistaSolicitudes.updateMany(
        {
            ...filtro,
            fecha_visita: { $lt: hoy },
            estado: { $ne: 2 },
        },
        {
            $set: {
                estado: 3,
                "items.$[].estado": 3,
                fecha_modificacion: new Date(),
            },
        }
    );
};

const existeSolicitudConFechaYCantidad = async (
    id_contratista: Types.ObjectId,
    fecha_visita: string,
    cantidad: number
) => {
    const fecha = new Date(fecha_visita);
    if (Number.isNaN(fecha.getTime())) return false;
    const { inicio, fin } = rangoDia(fecha);
    const existente = await ContratistaSolicitudes.findOne({
        id_contratista,
        fecha_visita: { $gte: inicio, $lte: fin },
        $expr: { $eq: [{ $size: "$items" }, cantidad] },
    })
        .select("_id")
        .lean();
    return Boolean(existente);
};

const obtenerVisitantesOcupadosPorFecha = async (
    id_contratista: Types.ObjectId,
    fecha_visita: string
): Promise<Types.ObjectId[]> => {
    const fecha = new Date(fecha_visita);
    if (Number.isNaN(fecha.getTime())) return [];
    const { inicio, fin } = rangoDia(fecha);
    const ocupados = await ContratistaSolicitudes.aggregate([
        {
            $match: {
                id_contratista,
                fecha_visita: { $gte: inicio, $lte: fin },
            },
        },
        { $unwind: "$items" },
        { $match: { "items.estado": { $ne: 3 } } },
        { $group: { _id: "$items.id_visitante" } },
    ]);
    return ocupados.map((o) => o._id as Types.ObjectId);
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

        const { fecha_visita, comentario, visitantes, anfitriones } = req.body as {
            fecha_visita: string;
            comentario?: string;
            visitantes: string[];
            anfitriones?: string[];
        };
        if (!fecha_visita || !Array.isArray(visitantes) || visitantes.length === 0) {
            res.status(200).json({ estado: false, mensaje: "Faltan datos para crear la solicitud." });
            return;
        }
        const hoy = inicioHoy();
        const fechaSolicitud = new Date(fecha_visita);
        if (Number.isNaN(fechaSolicitud.getTime()) || fechaSolicitud < hoy) {
            res.status(200).json({
                estado: false,
                mensaje: "No puedes crear solicitudes para días anteriores.",
            });
            return;
        }

        const visitantesIds = visitantes.map((id) => new Types.ObjectId(id));
        const ocupados = await obtenerVisitantesOcupadosPorFecha(contratista._id, fecha_visita);
        const ocupadosSet = new Set(ocupados.map((id) => String(id)));
        const duplicados = visitantesIds.filter((id) => ocupadosSet.has(String(id)));
        if (duplicados.length > 0) {
            res.status(200).json({
                estado: false,
                mensaje: "Ya se encuentra una solicitud de visita con esas personas ese día.",
                duplicado: true,
                duplicados,
            });
            return;
        }
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

        const anfitrionesIds = Array.isArray(anfitriones)
            ? anfitriones
                .filter((id) => Types.ObjectId.isValid(id))
                .map((id) => new Types.ObjectId(id))
            : [];
        let anfitrionesValidos: Types.ObjectId[] = [];
        if (anfitrionesIds.length > 0) {
            const registrosAnfitriones = await Empleados.find({
                _id: { $in: anfitrionesIds },
                id_empresa: contratista.id_empresa,
                activo: true,
            })
                .select("_id")
                .lean();
            anfitrionesValidos = registrosAnfitriones.map((item: any) => item._id);
            if (anfitrionesValidos.length !== anfitrionesIds.length) {
                res.status(200).json({
                    estado: false,
                    mensaje: "Hay anfitriones invÃ¡lidos o inactivos.",
                });
                return;
            }
        }

        const nuevaSolicitud = new ContratistaSolicitudes({
            id_contratista: contratista._id,
            id_empresa: contratista.id_empresa,
            fecha_visita: new Date(fecha_visita),
            comentario,
            anfitriones: anfitrionesValidos,
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

        const correosDestino = await obtenerCorreosNotificacionContratista(contratista as any);
        if (correosDestino.length > 0) {
            const anfitrionesDetalle = anfitrionesValidos.length > 0
                ? await Empleados.find(
                    { _id: { $in: anfitrionesValidos }, activo: true },
                    { nombre: 1, apellido_pat: 1, apellido_mat: 1 }
                ).lean()
                : [];
            await enviarCorreoSeguro(
                () =>
                    enviarCorreoContratistaSolicitudCreada({
                        correos: correosDestino,
                        empresa: String((contratista as any).empresa || ""),
                        fecha_visita: new Date(fecha_visita),
                        visitantes: visitantesValidos.map((v: any) => construirNombreCompleto(v)),
                        anfitriones: anfitrionesDetalle.map((a: any) => construirNombreCompleto(a)),
                        comentario: comentario || "",
                    }),
                "contratista-solicitud-creada"
            );
        }

        res.status(200).json({ estado: true, datos: nuevaSolicitud });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function validarSolicitud(req: Request, res: Response): Promise<void> {
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

        const { fecha_visita, visitantes_count, visitantes } = req.body as {
            fecha_visita: string;
            visitantes_count: number;
            visitantes?: string[];
        };
        if (!fecha_visita || !Number.isFinite(visitantes_count)) {
            res.status(200).json({ estado: false, mensaje: "Faltan datos para validar la solicitud." });
            return;
        }
        const hoy = inicioHoy();
        const fechaSolicitud = new Date(fecha_visita);
        if (Number.isNaN(fechaSolicitud.getTime()) || fechaSolicitud < hoy) {
            res.status(200).json({
                estado: false,
                mensaje: "No puedes crear solicitudes para días anteriores.",
            });
            return;
        }

        const visitantesIds = Array.isArray(visitantes)
            ? visitantes.map((id) => new Types.ObjectId(id))
            : [];
        if (visitantesIds.length > 0) {
            const ocupados = await obtenerVisitantesOcupadosPorFecha(contratista._id, fecha_visita);
            const ocupadosSet = new Set(ocupados.map((id) => String(id)));
            const duplicados = visitantesIds.filter((id) => ocupadosSet.has(String(id)));
            if (duplicados.length > 0) {
                res.status(200).json({
                    estado: false,
                    mensaje: "Ya se encuentra una solicitud de visita con esas personas ese día.",
                    duplicado: true,
                    duplicados,
                });
                return;
            }
        }

        const duplicado = await existeSolicitudConFechaYCantidad(
            contratista._id,
            fecha_visita,
            Number(visitantes_count)
        );
        if (duplicado) {
            res.status(200).json({
                estado: false,
                mensaje: "Ya se encuentra una solicitud de visita con esas personas ese día.",
                duplicado: true,
            });
            return;
        }

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerVisitantesOcupados(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await Contratistas.findById(req.query?.id_contratista as string);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const fecha_visita = String(req.query?.fecha_visita || "");
        if (!fecha_visita) {
            res.status(200).json({ estado: false, mensaje: "Falta la fecha de visita." });
            return;
        }

        const ocupados = await obtenerVisitantesOcupadosPorFecha(contratista._id, fecha_visita);
        res.status(200).json({ estado: true, datos: { ocupados } });
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
        if (contratista?._id) {
            await marcarSolicitudesVencidas({ id_contratista: contratista._id });
        }

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
            customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["comentario"]);

        const rango = normalizarRangoFechas(
            req.query?.fecha_desde as string | undefined,
            req.query?.fecha_hasta as string | undefined
        );
        const estadoFiltro = Number.isFinite(Number(req.query?.estado))
            ? Number(req.query?.estado)
            : null;

        const matchBase: Record<string, any> = contratista ? { id_contratista: contratista._id } : {};
        if (rango?.inicio && rango?.fin) {
            matchBase.fecha_visita = { $gte: rango.inicio, $lte: rango.fin };
        }
        if (estadoFiltro && estadoFiltro > 0) {
            matchBase.estado = estadoFiltro;
        }

        const aggregation: PipelineStage[] = [
            { $match: matchBase },
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

export async function obtenerResumenSolicitudesContratista(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await Contratistas.findById(req.query?.id_contratista as string);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const rango = normalizarRangoFechas(
            req.query?.fecha_desde as string | undefined,
            req.query?.fecha_hasta as string | undefined
        );
        const matchBase: Record<string, any> = { id_contratista: contratista._id };
        if (rango?.inicio && rango?.fin) {
            matchBase.fecha_visita = { $gte: rango.inicio, $lte: rango.fin };
        }

        const aggregation: PipelineStage[] = [
            { $match: matchBase },
            { $group: { _id: "$estado", count: { $sum: 1 } } },
        ];
        const resultados = await ContratistaSolicitudes.aggregate(aggregation);
        const resumen = resultados.reduce(
            (acc, item) => {
                acc.total += item.count;
                if (item._id === 1) acc.pendientes += item.count;
                if (item._id === 2) acc.aprobadas += item.count;
                if (item._id === 3) acc.rechazadas += item.count;
                if (item._id === 4) acc.parciales += item.count;
                return acc;
            },
            { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0, parciales: 0 }
        );

        res.status(200).json({ estado: true, datos: resumen });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerPendientes(req: Request, res: Response): Promise<void> {
    try {
        await marcarSolicitudesVencidas();
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
            customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["comentario"]);

        const rango = normalizarRangoFechas(
            req.query?.fecha_desde as string | undefined,
            req.query?.fecha_hasta as string | undefined
        );
        const estadoFiltro = Number.isFinite(Number(req.query?.estado))
            ? Number(req.query?.estado)
            : null;
        const matchEstado = estadoFiltro !== null ? { estado: estadoFiltro } : {};
        const urgente = String(req.query?.urgente || "") === "1";
        const empresaFiltro = String(req.query?.empresa || "").trim();
        let contratistasFiltrados: Types.ObjectId[] = [];
        if (empresaFiltro) {
            const contratistas = await Contratistas.find(
                { empresa: { $regex: empresaFiltro, $options: "i" } },
                { _id: 1 }
            ).lean();
            contratistasFiltrados = contratistas
                .map((c: any) => c._id)
                .filter(Boolean);
            if (contratistasFiltrados.length === 0) {
                res.status(200).json({
                    estado: true,
                    datos: { paginatedResults: [], totalCount: [] },
                });
                return;
            }
        }
        const manana = inicioManana();
        const mananaFin = new Date(manana);
        mananaFin.setHours(23, 59, 59, 999);

        const aggregation: PipelineStage[] = [
            {
                $match: {
                    ...(urgente ? { estado: 1 } : matchEstado),
                    ...(urgente
                        ? { fecha_visita: { $gte: manana, $lte: mananaFin } }
                        : {}),
                    ...(rango?.inicio && rango?.fin
                        ? { fecha_visita: { $gte: rango.inicio, $lte: rango.fin } }
                        : {}),
                    ...(contratistasFiltrados.length > 0
                        ? { id_contratista: { $in: contratistasFiltrados } }
                        : {}),
                },
            },
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

export async function obtenerResumenSolicitudesAdmin(req: Request, res: Response): Promise<void> {
    try {
        const rango = normalizarRangoFechas(
            req.query?.fecha_desde as string | undefined,
            req.query?.fecha_hasta as string | undefined
        );
        const empresaFiltro = String(req.query?.empresa || "").trim();
        const matchBase: Record<string, any> = {};
        if (rango?.inicio && rango?.fin) {
            matchBase.fecha_visita = { $gte: rango.inicio, $lte: rango.fin };
        }
        if (empresaFiltro) {
            const contratistas = await Contratistas.find(
                { empresa: { $regex: empresaFiltro, $options: "i" } },
                { _id: 1 }
            ).lean();
            const ids = contratistas.map((c: any) => c._id).filter(Boolean);
            if (ids.length === 0) {
                res.status(200).json({
                    estado: true,
                    datos: { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0, parciales: 0, urgentes: 0 },
                });
                return;
            }
            matchBase.id_contratista = { $in: ids };
        }

        const aggregation: PipelineStage[] = [
            { $match: matchBase },
            { $group: { _id: "$estado", count: { $sum: 1 } } },
        ];
        const resultados = await ContratistaSolicitudes.aggregate(aggregation);
        const manana = inicioManana();
        const mananaFin = new Date(manana);
        mananaFin.setHours(23, 59, 59, 999);
        const urgentes = await ContratistaSolicitudes.countDocuments({
            ...matchBase,
            estado: 1,
            fecha_visita: { $gte: manana, $lte: mananaFin },
        });
        const resumen = resultados.reduce(
            (acc, item) => {
                acc.total += item.count;
                if (item._id === 1) acc.pendientes += item.count;
                if (item._id === 2) acc.aprobadas += item.count;
                if (item._id === 3) acc.rechazadas += item.count;
                if (item._id === 4) acc.parciales += item.count;
                return acc;
            },
            { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0, parciales: 0 }
        );
        (resumen as any).urgentes = urgentes;

        res.status(200).json({ estado: true, datos: resumen });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerEmpresasSolicitudesAdmin(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const empresas = await Contratistas.distinct("empresa", {
            empresa: { $nin: [null, ""] },
        });
        empresas.sort((a, b) => String(a).localeCompare(String(b)));
        res.status(200).json({ estado: true, datos: empresas });
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
        if (registro.estado !== 2 && registro.fecha_visita && registro.fecha_visita < inicioHoy()) {
            await marcarSolicitudesVencidas({ id_contratista: registro.id_contratista as any });
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
        const anfitrionesIds = (registro.anfitriones || []).map((id) => new Types.ObjectId(id));
        const anfitriones = anfitrionesIds.length > 0
            ? await Empleados.find(
                { _id: { $in: anfitrionesIds }, activo: true },
                { nombre: 1, apellido_pat: 1, apellido_mat: 1, correo: 1 }
            ).lean()
            : [];
        res.status(200).json({ estado: true, datos: { ...registro, visitantes, anfitriones } });
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

        const contratista = await Contratistas.findById(solicitud.id_contratista, {
            empresa: 1,
            correos: 1,
            id_usuario: 1,
        }).lean();

        if (contratista) {
            const correosDestino = await obtenerCorreosNotificacionContratista(contratista as any);
            const visitantesIds = actualizados.map((item) => item.id_visitante);
            const visitantesSolicitud = await ContratistaVisitantes.find(
                { _id: { $in: visitantesIds } },
                { nombre: 1, apellido_pat: 1, apellido_mat: 1 }
            ).lean();
            const mapaVisitantes = new Map<string, string>(
                visitantesSolicitud.map((v: any) => [String(v._id), construirNombreCompleto(v)])
            );
            const aprobados = actualizados
                .filter((item) => item.estado === 2)
                .map((item) => mapaVisitantes.get(String(item.id_visitante)) || String(item.id_visitante));
            const rechazados = actualizados
                .filter((item) => item.estado === 3)
                .map((item) => {
                    const nombre = mapaVisitantes.get(String(item.id_visitante)) || String(item.id_visitante);
                    return item.motivo ? `${nombre} (Motivo: ${item.motivo})` : nombre;
                });
            const anfitrionesDetalle = (solicitud.anfitriones || []).length > 0
                ? await Empleados.find(
                    { _id: { $in: solicitud.anfitriones }, activo: true },
                    { nombre: 1, apellido_pat: 1, apellido_mat: 1, correo: 1 }
                ).lean()
                : [];
            const anfitrionesNombres = anfitrionesDetalle.map((a: any) => construirNombreCompleto(a));

            if (correosDestino.length > 0) {
                await enviarCorreoSeguro(
                    () =>
                        enviarCorreoContratistaSolicitudResultado({
                            correos: correosDestino,
                            empresa: String((contratista as any).empresa || ""),
                            fecha_visita: solicitud.fecha_visita,
                            estado: solicitud.estado,
                            aprobados,
                            rechazados,
                            anfitriones: anfitrionesNombres,
                            comentario: solicitud.comentario || "",
                        }),
                    "contratista-solicitud-resultado"
                );
            }

            if (aprobados.length > 0 && anfitrionesDetalle.length > 0) {
                const destinatariosAnfitrion = [
                    ...new Set(
                        anfitrionesDetalle
                            .map((a: any) => normalizarCorreo(a.correo))
                            .filter(Boolean)
                    ),
                ];
                for await (const correoAnfitrion of destinatariosAnfitrion) {
                    const anfitrion = anfitrionesDetalle.find(
                        (a: any) => normalizarCorreo(a.correo) === correoAnfitrion
                    );
                    await enviarCorreoSeguro(
                        () =>
                            enviarCorreoAnfitrionSolicitudAprobada({
                                correo: correoAnfitrion,
                                anfitrion: anfitrion ? construirNombreCompleto(anfitrion as any) : "",
                                empresa: String((contratista as any).empresa || ""),
                                fecha_visita: solicitud.fecha_visita,
                                visitantes_aprobados: aprobados,
                                comentario: solicitud.comentario || "",
                            }),
                        "anfitrion-solicitud-aprobada"
                    );
                }
            }
        }

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
