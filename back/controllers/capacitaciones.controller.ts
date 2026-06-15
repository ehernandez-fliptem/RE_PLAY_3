import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import Capacitaciones, { ICapacitacion, IPasoCapacitacion } from "../models/Capacitaciones";
import CapacitacionesResultados from "../models/CapacitacionesResultados";
import { UserRequest } from "../types/express";
import { QueryParams } from "../types/queryparams";
import { customAggregationForDataGrids, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import { fecha, log } from "../middlewares/log";

function slugify(value: string) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function normalizeBloques(paso: any, pasoIndex: number): IPasoCapacitacion {
    const bloques = Array.isArray(paso?.bloques) ? paso.bloques : [];
    return {
        id: String(paso?.id || `paso-${Date.now()}-${pasoIndex}`),
        titulo: String(paso?.titulo || `Paso ${pasoIndex + 1}`).trim(),
        descripcion: String(paso?.descripcion || "").trim(),
        orden: Number(paso?.orden || pasoIndex + 1),
        tiempo_minimo_segundos: Number(paso?.tiempo_minimo_segundos || 0),
        confirmacion_requerida: Boolean(paso?.confirmacion_requerida),
        reglas_avance: {
            requiere_ver_todos_los_bloques: Boolean(paso?.reglas_avance?.requiere_ver_todos_los_bloques),
            requiere_tiempo_minimo: Boolean(paso?.reglas_avance?.requiere_tiempo_minimo),
            requiere_checklist: Boolean(paso?.reglas_avance?.requiere_checklist),
            requiere_preguntas: Boolean(paso?.reglas_avance?.requiere_preguntas),
            requiere_respuestas_correctas: Boolean(paso?.reglas_avance?.requiere_respuestas_correctas),
            requiere_abrir_interactivos: Boolean(paso?.reglas_avance?.requiere_abrir_interactivos),
            requiere_video_completo: Boolean(paso?.reglas_avance?.requiere_video_completo),
            requiere_abrir_links: Boolean(paso?.reglas_avance?.requiere_abrir_links),
        },
        bloques: bloques.map((bloque: any, bloqueIndex: number) => ({
            id: String(bloque?.id || `bloque-${Date.now()}-${pasoIndex}-${bloqueIndex}`),
            tipo: bloque?.tipo || "texto",
            orden: Number(bloque?.orden || bloqueIndex + 1),
            titulo: String(bloque?.titulo || "").trim(),
            contenido: bloque?.contenido || {},
            configuracion: bloque?.configuracion || {},
            reglas: bloque?.reglas || {},
            estilos: bloque?.estilos || {},
        })),
    };
}

function buildPayload(body: any, userId?: string) {
    const pasos = Array.isArray(body.pasos) ? body.pasos.map(normalizeBloques) : [];
    return {
        titulo: String(body.titulo || "").trim(),
        descripcion: String(body.descripcion || "").trim(),
        slug: slugify(body.slug || body.titulo),
        estado: body.estado || "borrador",
        color_principal: body.color_principal || "#6d00f5",
        logo_url: String(body.logo_url || "").trim(),
        portada_url: String(body.portada_url || "").trim(),
        configuracion: body.configuracion || {},
        pasos,
        modificado_por: userId,
        fecha_modificacion: new Date(),
    };
}

function validarPublicacion(payload: Partial<ICapacitacion>) {
    const mensajes: Record<string, string> = {};
    if (!String(payload.titulo || "").trim()) mensajes.titulo = "El titulo es obligatorio.";
    if (!String(payload.slug || "").trim()) mensajes.slug = "El slug es obligatorio.";
    if (payload.estado === "publicada") {
        if (!Array.isArray(payload.pasos) || payload.pasos.length === 0) {
            mensajes.pasos = "Agrega al menos un paso para publicar.";
        } else {
            const pasoSinContenido = payload.pasos.find((paso) => !paso.bloques || paso.bloques.length === 0);
            if (pasoSinContenido) mensajes.pasos = "Todos los pasos deben tener al menos un bloque.";
        }
    }
    return mensajes;
}

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const { filter = "[]", pagination = "{\"page\":0,\"pageSize\":10}", sort = "[]" } = req.query as {
            filter: string;
            pagination: string;
            sort: string;
        };
        const estado = String(req.query.estado || "");
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];
        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB,
        } = customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["titulo", "descripcion", "slug", "estado"]);

        const aggregation: PipelineStage[] = [
            {
                $lookup: {
                    from: "usuarios",
                    localField: "creado_por",
                    foreignField: "_id",
                    as: "creado_por",
                    pipeline: [{ $project: { nombre: { $concat: ["$nombre", " ", "$apellido_pat"] } } }],
                },
            },
            {
                $project: {
                    titulo: 1,
                    descripcion: 1,
                    slug: 1,
                    estado: 1,
                    pasos_count: { $size: "$pasos" },
                    fecha_modificacion: 1,
                    fecha_creacion: 1,
                    activo: 1,
                    creado_por: { $arrayElemAt: ["$creado_por.nombre", 0] },
                },
            },
        ];
        const match: any[] = [];
        if (estado) match.push({ estado });
        if (filterMDB.length > 0) match.push({ $or: filterMDB });
        if (match.length > 0) aggregation.push({ $match: { $and: match } });
        aggregation.push(
            { $sort: sortMDB || { fecha_modificacion: -1, fecha_creacion: -1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [{ $count: "count" }],
                },
            }
        );
        const registros = await Capacitaciones.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Capacitaciones.findById(req.params.id).lean();
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Capacitacion no encontrada." });
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
        const id_usuario = String((req as UserRequest).userId || "");
        const payload = buildPayload(req.body, id_usuario);
        const mensajesPublicacion = validarPublicacion(payload as Partial<ICapacitacion>);
        if (!isEmptyObject(mensajesPublicacion)) {
            res.status(400).json({ estado: false, mensaje: "Revisa los datos de la capacitacion.", mensajes: mensajesPublicacion });
            return;
        }
        const registro = new Capacitaciones({ ...payload, creado_por: id_usuario });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: "Revisa los datos de la capacitacion.", mensajes });
            return;
        }
        await registro.save();
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = String((req as UserRequest).userId || "");
        const payload = buildPayload(req.body, id_usuario);
        const mensajesPublicacion = validarPublicacion(payload as Partial<ICapacitacion>);
        if (!isEmptyObject(mensajesPublicacion)) {
            res.status(400).json({ estado: false, mensaje: "Revisa los datos de la capacitacion.", mensajes: mensajesPublicacion });
            return;
        }
        const registro = await Capacitaciones.findByIdAndUpdate(
            req.params.id,
            { $set: payload },
            { new: true, runValidators: true }
        ).catch(async (err) => {
            const mensajes = await validarModelo(err, true);
            if (!isEmptyObject(mensajes)) {
                res.status(400).json({ estado: false, mensaje: "Revisa los datos de la capacitacion.", mensajes });
                return null;
            }
            throw err;
        });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Capacitacion no encontrada." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const { estado } = req.body;
        const registro = await Capacitaciones.findById(req.params.id);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Capacitacion no encontrada." });
            return;
        }
        const mensajesPublicacion = validarPublicacion({ ...registro.toObject(), estado } as Partial<ICapacitacion>);
        if (!isEmptyObject(mensajesPublicacion)) {
            res.status(400).json({ estado: false, mensaje: "No se puede publicar la capacitacion.", mensajes: mensajesPublicacion });
            return;
        }
        registro.estado = estado || registro.estado;
        registro.activo = registro.estado !== "inactiva";
        registro.modificado_por = (req as UserRequest).userId as any;
        registro.fecha_modificacion = new Date();
        await registro.save();
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function duplicar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = String((req as UserRequest).userId || "");
        const registro = await Capacitaciones.findById(req.params.id).lean();
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Capacitacion no encontrada." });
            return;
        }
        const copia = new Capacitaciones({
            ...registro,
            _id: undefined,
            titulo: `${registro.titulo} copia`,
            slug: `${registro.slug}-copia-${Date.now()}`,
            estado: "borrador",
            creado_por: id_usuario,
            modificado_por: id_usuario,
            fecha_creacion: new Date(),
            fecha_modificacion: new Date(),
        });
        await copia.save();
        res.status(200).json({ estado: true, datos: copia });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function eliminar(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Capacitaciones.findByIdAndDelete(req.params.id);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Capacitacion no encontrada." });
            return;
        }
        await CapacitacionesResultados.deleteMany({ capacitacion: req.params.id });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerPublica(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Capacitaciones.findOne({
            slug: slugify(req.params.slug),
            estado: "publicada",
            activo: true,
        }).lean();
        if (!registro) {
            res.status(404).json({ estado: false, mensaje: "Esta capacitacion no esta disponible." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function registrarResultado(req: Request, res: Response): Promise<void> {
    try {
        const capacitacion = await Capacitaciones.findOne({
            _id: new Types.ObjectId(req.params.id),
            estado: "publicada",
            activo: true,
        }).lean();
        if (!capacitacion) {
            res.status(404).json({ estado: false, mensaje: "Esta capacitacion no esta disponible." });
            return;
        }
        const body = req.body || {};
        const registro = new CapacitacionesResultados({
            capacitacion: capacitacion._id,
            nombre: body.nombre || "",
            correo: body.correo || "",
            empresa: body.empresa || "",
            numero_empleado: body.numero_empleado || "",
            fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : new Date(),
            fecha_fin: new Date(),
            completado: true,
            porcentaje: Number(body.porcentaje || 100),
            respuestas: Array.isArray(body.respuestas) ? body.respuestas : [],
            pasos_completados: Array.isArray(body.pasos_completados) ? body.pasos_completados : [],
            tiempo_total_segundos: Number(body.tiempo_total_segundos || 0),
            origen: body.origen || "publico",
        });
        await registro.save();
        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerResultados(req: Request, res: Response): Promise<void> {
    try {
        const resultados = await CapacitacionesResultados.find({ capacitacion: req.params.id })
            .sort({ fecha_fin: -1, fecha_inicio: -1 })
            .lean();
        res.status(200).json({ estado: true, datos: resultados });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
