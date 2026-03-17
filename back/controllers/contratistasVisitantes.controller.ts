import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import crypto from "crypto";
import Excel from "exceljs";
import fs from "fs";
import { UserRequest } from "../types/express";
import { QueryParams } from "../types/queryparams";
import Contratistas from "../models/Contratistas";
import ContratistaVisitantes, { IContratistaVisitante } from "../models/ContratistaVisitantes";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import { CONFIG } from "../config";

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

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
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
                    estado_validacion: 1,
                    fecha_creacion: 1,
                    activo: 1,
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

        const { nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks } = req.body;
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

        const { nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks } = req.body;
        const hash_datos = calcularHashVisitante({ nombre, apellido_pat, apellido_mat, correo, telefono, documentos_checks });

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
            hash_datos,
            fecha_modificacion: new Date(),
            modificado_por: id_usuario as any,
        };

        const requiereRevision =
            registro.estado_validacion === 2 && registro.hash_ultimo_aprobado && registro.hash_ultimo_aprobado !== hash_datos;

        if (requiereRevision) {
            updateData.estado_validacion = 1;
            updateData.motivo_rechazo = "";
            updateData.fecha_validacion = null as any;
            updateData.validado_por = null as any;
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
