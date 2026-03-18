import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import crypto from "crypto";
import Excel from "exceljs";
import fs from "fs";
import { UserRequest } from "../types/express";
import { QueryParams } from "../types/queryparams";
import Contratistas from "../models/Contratistas";
import Usuarios from "../models/Usuarios";
import ContratistaVisitantes, { IContratistaVisitante } from "../models/ContratistaVisitantes";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import { CONFIG } from "../config";
import { enviarCorreoRechazoVisitanteContratista } from "../utils/correos";

const DOC_KEYS = [
    "identificacion_oficial",
    "sua",
    "permiso_entrada",
    "lista_articulos",
    "repse",
    "soporte_pago_actualizado",
    "constancia_vigencia_imss",
    "constancias_habilidades",
] as const;

type DocChecks = Record<(typeof DOC_KEYS)[number], boolean>;
type DocFiles = Record<(typeof DOC_KEYS)[number], string>;

const DOC_LABELS: Record<(typeof DOC_KEYS)[number], string> = {
    identificacion_oficial: "Identificación oficial",
    sua: "SUA",
    permiso_entrada: "Permiso de entrada",
    lista_articulos: "Lista de artículos",
    repse: "REPSE",
    soporte_pago_actualizado: "Soporte de pago actualizado",
    constancia_vigencia_imss: "Constancia de vigencia IMSS",
    constancias_habilidades: "Constancias de habilidades",
};

const normalizeDocChecks = (value?: Partial<DocChecks> | null): DocChecks => ({
    identificacion_oficial: Boolean(value?.identificacion_oficial),
    sua: Boolean(value?.sua),
    permiso_entrada: Boolean(value?.permiso_entrada),
    lista_articulos: Boolean(value?.lista_articulos),
    repse: Boolean(value?.repse),
    soporte_pago_actualizado: Boolean(value?.soporte_pago_actualizado),
    constancia_vigencia_imss: Boolean(value?.constancia_vigencia_imss),
    constancias_habilidades: Boolean(value?.constancias_habilidades),
});

const normalizeDocFiles = (value?: Partial<DocFiles> | null): DocFiles => ({
    identificacion_oficial: String(value?.identificacion_oficial || ""),
    sua: String(value?.sua || ""),
    permiso_entrada: String(value?.permiso_entrada || ""),
    lista_articulos: String(value?.lista_articulos || ""),
    repse: String(value?.repse || ""),
    soporte_pago_actualizado: String(value?.soporte_pago_actualizado || ""),
    constancia_vigencia_imss: String(value?.constancia_vigencia_imss || ""),
    constancias_habilidades: String(value?.constancias_habilidades || ""),
});

const areDocChecksComplete = (value?: Partial<DocChecks> | null): boolean =>
    DOC_KEYS.every((key) => Boolean(value?.[key]));

const calcularHashVisitante = (payload: {
    nombre?: string;
    apellido_pat?: string;
    apellido_mat?: string;
    correo?: string;
    telefono?: string;
    documentos_checks?: Partial<DocChecks> | null;
}) => {
    const data = {
        nombre: String(payload.nombre || "").trim().toLowerCase(),
        apellido_pat: String(payload.apellido_pat || "").trim().toLowerCase(),
        apellido_mat: String(payload.apellido_mat || "").trim().toLowerCase(),
        correo: String(payload.correo || "").trim().toLowerCase(),
        telefono: String(payload.telefono || "").trim(),
        documentos_checks: normalizeDocChecks(payload.documentos_checks),
    };
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

const obtenerContratistaDeUsuario = async (id_usuario: string) => {
    return Contratistas.findOne({ id_usuario, activo: true });
};

const obtenerContratistaParaAdmin = async (req: Request) => {
    const idContratista = (req.query.contratista || req.body?.id_contratista) as string | undefined;
    if (!idContratista) return null;
    return Contratistas.findById(idContratista);
};

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await obtenerContratistaParaAdmin(req);
        if (role.includes(11) && !contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const { filter, pagination, sort, docs_estado, solo_pendientes } = req.query as {
            filter: string;
            pagination: string;
            sort: string;
            docs_estado?: string;
            solo_pendientes?: string;
        };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
            customAggregationForDataGrids(queryFilter, querySort, queryPagination, [
                "nombre",
                "apellido_pat",
                "apellido_mat",
                "correo",
                "empresa",
            ]);

        const aggregation: PipelineStage[] = [
            { $match: contratista ? { id_contratista: contratista._id } : {} },
            {
                $set: {
                    nombre_completo: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] },
                        },
                    },
                    docs_completos: {
                        $and: [
                            { $ifNull: ["$documentos_archivos.identificacion_oficial", ""] },
                            { $ifNull: ["$documentos_archivos.sua", ""] },
                            { $ifNull: ["$documentos_archivos.permiso_entrada", ""] },
                            { $ifNull: ["$documentos_archivos.lista_articulos", ""] },
                            { $ifNull: ["$documentos_archivos.repse", ""] },
                            { $ifNull: ["$documentos_archivos.soporte_pago_actualizado", ""] },
                            { $ifNull: ["$documentos_archivos.constancia_vigencia_imss", ""] },
                            { $ifNull: ["$documentos_archivos.constancias_habilidades", ""] },
                        ],
                    },
                },
            },
            {
                $project: {
                    nombre: 1,
                    apellido_pat: 1,
                    apellido_mat: 1,
                    nombre_completo: 1,
                    correo: 1,
                    telefono: 1,
                    empresa: 1,
                    documentos_checks: 1,
                    docs_completos: 1,
                    estado_validacion: 1,
                    fecha_creacion: 1,
                    activo: 1,
                },
            },
        ];
        if (docs_estado === "completo") {
            aggregation.push({ $match: { docs_completos: true } });
        } else if (docs_estado === "incompleto") {
            aggregation.push({ $match: { docs_completos: false } });
        }
        if (solo_pendientes === "1") {
            aggregation.push({ $match: { estado_validacion: 1 } });
        }
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

        const registros = await ContratistaVisitantes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await obtenerContratistaParaAdmin(req);
        if (role.includes(11) && !contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }
        const registro = await ContratistaVisitantes.findOne(
            contratista ? { _id: req.params.id, id_contratista: contratista._id } : { _id: req.params.id }
        );
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
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
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await obtenerContratistaParaAdmin(req);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado. Selecciona uno." });
            return;
        }

        const { nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks, documentos_archivos } = req.body;
        const hash_datos = calcularHashVisitante({ nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks });

        const existeCorreo = await ContratistaVisitantes.findOne({
            correo: String(correo || "").trim().toLowerCase(),
            id_contratista: contratista._id,
        }, "_id").lean();
        if (existeCorreo) {
            res.status(200).json({ estado: false, mensaje: "El correo ya está registrado en tu catálogo." });
            return;
        }

        const nuevoVisitante = new ContratistaVisitantes({
            id_contratista: contratista._id,
            id_empresa: contratista.id_empresa,
            empresa: contratista.empresa,
            nombre,
            apellido_pat,
            apellido_mat,
            correo,
            telefono,
            documentos_checks: normalizeDocChecks(documentos_checks),
            documentos_archivos: normalizeDocFiles(documentos_archivos),
            hash_datos,
            estado_validacion: 1,
            creado_por: id_usuario,
        });

        const mensajes = await validarModelo(nuevoVisitante);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: "Revisa que los datos sean correctos.", mensajes });
            return;
        }

        await nuevoVisitante.save();
        res.status(200).json({ estado: true, datos: nuevoVisitante });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await obtenerContratistaParaAdmin(req);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado. Selecciona uno." });
            return;
        }
        const registro = await ContratistaVisitantes.findOne({
            _id: req.params.id,
            id_contratista: contratista._id,
        });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
            return;
        }
        if (role.includes(11) && registro.estado_validacion !== 2) {
            res.status(200).json({
                estado: false,
                mensaje: "Solo puedes modificar visitantes aprobados.",
            });
            return;
        }

        const { nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks, documentos_archivos } = req.body;
        const hash_datos = calcularHashVisitante({ nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks });

        const normalizedIncomingFiles = normalizeDocFiles(documentos_archivos);
        const normalizedPrevFiles = normalizeDocFiles(registro.documentos_archivos);
        const filesChanged = DOC_KEYS.some(
            (key) => normalizedIncomingFiles[key] !== normalizedPrevFiles[key]
        );

        const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase();
        const normalizePhone = (value?: string | null) => String(value || "").trim();
        const coreChanged =
            normalizeText(nombre) !== normalizeText(registro.nombre) ||
            normalizeText(apellido_pat) !== normalizeText(registro.apellido_pat) ||
            normalizeText(apellido_mat) !== normalizeText(registro.apellido_mat) ||
            normalizeText(correo) !== normalizeText(registro.correo) ||
            normalizePhone(telefono) !== normalizePhone(registro.telefono);

        if (correo && String(correo).trim().toLowerCase() !== String(registro.correo).trim().toLowerCase()) {
            const existeCorreo = await ContratistaVisitantes.findOne({
                correo: String(correo).trim().toLowerCase(),
                id_contratista: contratista._id,
                _id: { $ne: registro._id },
            }, "_id").lean();
            if (existeCorreo) {
                res.status(200).json({ estado: false, mensaje: "El correo ya está registrado en tu catálogo." });
                return;
            }
        }

        const updateData: Partial<IContratistaVisitante> = {
            nombre,
            apellido_pat,
            apellido_mat,
            correo,
            telefono,
            documentos_checks: normalizeDocChecks(documentos_checks),
            documentos_archivos: normalizedIncomingFiles,
            hash_datos,
            fecha_modificacion: new Date(),
            modificado_por: id_usuario as any,
        };

        const requiereRevision =
            registro.estado_validacion === 2 && (coreChanged || filesChanged);

        if (requiereRevision) {
            updateData.estado_validacion = 1;
            updateData.motivo_rechazo = "";
            updateData.fecha_validacion = null as any;
            updateData.validado_por = null as any;
            updateData.documentos_checks = normalizeDocChecks({});
        }

        const actualizado = await ContratistaVisitantes.findByIdAndUpdate(
            registro._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        res.status(200).json({ estado: true, datos: actualizado });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function verificar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : null;
        if (role.includes(11) && !contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }
        const registro = await ContratistaVisitantes.findOne(
            contratista
                ? { _id: req.params.id, id_contratista: contratista._id }
                : { _id: req.params.id }
        );
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
            return;
        }

        const mergedChecks = normalizeDocChecks({
            ...(registro.documentos_checks || {}),
            ...(req.body?.documentos_checks || {}),
        });

        const checks = mergedChecks;
        if (!areDocChecksComplete(checks)) {
            res.status(200).json({
                estado: false,
                mensaje: "No puedes verificar un visitante sin todos los documentos.",
            });
            return;
        }

        const now = new Date();
        const actualizado = await ContratistaVisitantes.findByIdAndUpdate(
            registro._id,
            {
                $set: {
                    estado_validacion: 2,
                    hash_ultimo_aprobado: registro.hash_datos || "",
                    fecha_validacion: now,
                    validado_por: id_usuario as any,
                    documentos_checks: checks,
                },
            },
            { new: true }
        );

        res.status(200).json({ estado: true, datos: actualizado });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function rechazar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const { motivo_rechazo } = req.body as { motivo_rechazo?: string };
        if (!motivo_rechazo || !String(motivo_rechazo).trim()) {
            res.status(200).json({ estado: false, mensaje: "El motivo de rechazo es obligatorio." });
            return;
        }

        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : null;
        if (role.includes(11) && !contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }
        const registro = await ContratistaVisitantes.findOne(
            contratista
                ? { _id: req.params.id, id_contratista: contratista._id }
                : { _id: req.params.id }
        );
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
            return;
        }

        const checks = normalizeDocChecks({
            ...(registro.documentos_checks || {}),
            ...(req.body?.documentos_checks || {}),
        });

        const now = new Date();
        const actualizado = await ContratistaVisitantes.findByIdAndUpdate(
            registro._id,
            {
                $set: {
                    estado_validacion: 3,
                    motivo_rechazo: String(motivo_rechazo).trim(),
                    fecha_validacion: now,
                    validado_por: id_usuario as any,
                    documentos_checks: checks,
                },
            },
            { new: true }
        );

        const contratistaRegistro = contratista || (await Contratistas.findById(registro.id_contratista));
        let correos = (contratistaRegistro?.correos || []).filter(Boolean);
        if (contratistaRegistro?.id_usuario) {
            const usuario = await Usuarios.findById(contratistaRegistro.id_usuario, "correo").lean();
            if (usuario?.correo) correos.push(String(usuario.correo));
        }
        correos = Array.from(new Set(correos.map((c) => String(c).trim().toLowerCase()).filter(Boolean)));

        const faltantes = DOC_KEYS.filter((key) => !checks[key]).map((key) => DOC_LABELS[key]);
        if (correos.length > 0) {
            await enviarCorreoRechazoVisitanteContratista({
                correos,
                empresa: contratistaRegistro?.empresa || registro.empresa,
                visitante: `${registro.nombre} ${registro.apellido_pat} ${registro.apellido_mat || ""}`.trim(),
                motivo: String(motivo_rechazo).trim(),
                faltantes,
            });
        }

        res.status(200).json({ estado: true, datos: actualizado });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function corregir(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const contratista = await obtenerContratistaDeUsuario(String(id_usuario));
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const registro = await ContratistaVisitantes.findOne({
            _id: req.params.id,
            id_contratista: contratista._id,
        });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
            return;
        }

        const incomingFiles = req.body?.documentos_archivos as Partial<DocFiles> | undefined;
        if (!incomingFiles || typeof incomingFiles !== "object") {
            res.status(200).json({
                estado: false,
                mensaje: "Debes proporcionar los documentos a corregir.",
            });
            return;
        }

        const mergedFiles = normalizeDocFiles({
            ...(registro.documentos_archivos || {}),
            ...incomingFiles,
        });

        const nextChecks = normalizeDocChecks(registro.documentos_checks || {});
        Object.keys(incomingFiles).forEach((key) => {
            if ((incomingFiles as any)[key]) {
                (nextChecks as any)[key] = false;
            }
        });

        const actualizado = await ContratistaVisitantes.findByIdAndUpdate(
            registro._id,
            {
                $set: {
                    documentos_archivos: mergedFiles,
                    documentos_checks: nextChecks,
                    estado_validacion: 1,
                    motivo_rechazo: "",
                    fecha_validacion: null,
                    validado_por: null,
                    fecha_modificacion: new Date(),
                    modificado_por: id_usuario as any,
                },
            },
            { new: true }
        );

        res.status(200).json({ estado: true, datos: actualizado });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

type ErroresCarga = {
    nombre?: string;
    apellido_pat?: string;
    apellido_mat?: string;
    correo?: string;
    telefono?: string;
};

const marcarDuplicadosCorreo = (arr: Array<{ correo: string; errores?: ErroresCarga }>) => {
    const map = new Map<string, number[]>();
    arr.forEach((item, idx) => {
        if (!item.correo) return;
        const key = item.correo.trim().toLowerCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(idx);
    });
    return arr.map((item, idx) => {
        const key = item.correo?.trim().toLowerCase();
        const duplicados = key ? (map.get(key) || []).filter((i) => i !== idx) : [];
        if (duplicados.length === 0) return item;
        return {
            ...item,
            errores: {
                ...(item.errores || {}),
                correo: `El correo se está repitiendo en la(s) fila(s): ${duplicados.map((i) => i + 2).join(", ")} de tu archivo.`,
            },
        };
    });
};

export async function cargarProgramacionVisitantes(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];
        const contratista = role.includes(11)
            ? await obtenerContratistaDeUsuario(String(id_usuario))
            : await obtenerContratistaParaAdmin(req);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado. Selecciona uno." });
            return;
        }
        const { registros: datos } = req.body;
        const registros: any[] = [];
        for await (const registro of datos) {
            const nuevoVisitante = new ContratistaVisitantes({
                id_contratista: contratista._id,
                id_empresa: contratista.id_empresa,
                empresa: contratista.empresa,
                ...registro,
                documentos_checks: normalizeDocChecks(registro.documentos_checks),
            });
            const mensajes = await validarModelo(nuevoVisitante);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...registro, errores: mensajes });
                continue;
            }
            registros.push({ ...registro });
        }
        const arrDuplicados = marcarDuplicadosCorreo(registros);
        const detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: arrDuplicados });
            return;
        }

        const correos = arrDuplicados.map((r) => String(r.correo || "").trim().toLowerCase()).filter(Boolean);
        if (correos.length > 0) {
            const existentes = await ContratistaVisitantes.find(
                { id_contratista: contratista._id, correo: { $in: correos } },
                "correo"
            ).lean();
            if (existentes.length > 0) {
                const setExist = new Set(existentes.map((e) => String(e.correo).toLowerCase()));
                const conErrores = arrDuplicados.map((r) => {
                    const correoNorm = String(r.correo || "").trim().toLowerCase();
                    if (setExist.has(correoNorm)) {
                        return { ...r, errores: { correo: "El correo ya está registrado." } };
                    }
                    return r;
                });
                res.status(200).send({ estado: false, datos: conErrores });
                return;
            }
        }

        let visitantesCreados = 0;
        const registrosGuardados = [];
        for await (const registro of arrDuplicados) {
            const registroAny = registro as any;
            const hash_datos = calcularHashVisitante(registroAny);
            const nuevoVisitante = new ContratistaVisitantes({
                id_contratista: contratista._id,
                id_empresa: contratista.id_empresa,
                empresa: contratista.empresa,
                ...registroAny,
                documentos_checks: normalizeDocChecks(registroAny.documentos_checks),
                hash_datos,
                creado_por: id_usuario,
            });
            await nuevoVisitante.save();
            visitantesCreados++;
            registrosGuardados.push({ ...registro });
        }
        res.status(200).send({ estado: true, datos: { registros: registrosGuardados, visitantes: visitantesCreados } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const KEYS = {
    "Nombre*": "nombre",
    "Apellido Paterno*": "apellido_pat",
    "Apellido Materno": "apellido_mat",
    "Correo*": "correo",
    "Teléfono": "telefono",
};

export async function cargarFormato(req: Request, res: Response): Promise<void> {
    try {
        const workbook = new Excel.Workbook();
        if (!req.files || !req.files.document) {
            res.status(400).send({ estado: false, mensaje: "No se ha proporcionado un archivo válido." });
            return;
        }
        const file = req.files.document;
        const datos: any[] = [];
        const fileData = Buffer.from(Array.isArray(file) ? file[0].data : file.data) as Buffer;
        await workbook.xlsx.load(fileData as any);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            res.status(400).send({ estado: false, mensaje: "No se pudo leer la hoja 1." });
            return;
        }
        const firstRow = worksheet.getRow(1);
        const keys = Array.isArray(firstRow.values) ? firstRow.values.map((item) => String(item)) : [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber == 1) return;
            const valores = Array.isArray(row.values) ? row.values.map((item) => item) : [];
            if (valores.length < 5) return;
            let obj: { [key: string]: string } = {};
            for (let i = 0; i < keys.length; i++) {
                obj[keys[i]] = String(valores[i] || "").trim();
            }
            const data = Object.entries(obj).reduce((op: { [key: string]: unknown }, [key, value]) => {
                const opKey = KEYS[key as keyof typeof KEYS];
                if (opKey) op[opKey] = String(value).trim();
                return op;
            }, {});
            if (!data.nombre && !data.apellido_pat && !data.correo) return;
            datos.push({ _id: new Types.ObjectId(), ...data });
        });

        if (datos.length === 0) {
            res.status(400).send({ estado: false, mensaje: "El archivo está vacío." });
            return;
        }

        const registros = [];
        for await (let usuario of datos) {
            const nuevoVisitante = new ContratistaVisitantes({
                id_contratista: new Types.ObjectId(),
                id_empresa: new Types.ObjectId(),
                empresa: "TEMP",
                ...usuario,
            });
            const mensajes = await validarModelo(nuevoVisitante);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...usuario, errores: mensajes });
                continue;
            }
            registros.push({ ...usuario });
        }
        const arrDuplicados = marcarDuplicadosCorreo(registros);
        const detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: arrDuplicados });
            return;
        }
        res.status(200).json({ estado: true, datos: arrDuplicados });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function descargarFormato(_req: Request, res: Response): Promise<void> {
    fs.unlink("./temp/formatoContratistasVisitantes.xlsx", function (err) {
        if (err) {
            crearExcel(res);
        } else {
            crearExcel(res);
        }
    });
}

async function crearExcel(res: Response) {
    const options = { root: "./" };
    try {
        fs.access("./temp/formatoContratistasVisitantes.xlsx", async (error: any) => {
            if (error) {
                const workbook = new Excel.Workbook();
                const worksheet = workbook.addWorksheet("General");
                const headersValues = ["Nombre*", "Apellido Paterno*", "Apellido Materno", "Correo*", "Teléfono"];
                worksheet.columns = headersValues.map((header) => ({ header, key: header, width: 40 })) as any;
                await worksheet.protect(CONFIG.SECRET_EXCELJS, {});
                await workbook.xlsx.writeFile("./temp/formatoContratistasVisitantes.xlsx");
                await res.sendFile("./temp/formatoContratistasVisitantes.xlsx", options);
            } else {
                await res.sendFile("./temp/formatoContratistasVisitantes.xlsx", options);
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
