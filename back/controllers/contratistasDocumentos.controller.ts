import { Request, Response } from "express";
import { UserRequest } from "../types/express";
import Contratistas from "../models/Contratistas";
import ContratistaDocumentos from "../models/ContratistaDocumentos";
import Configuracion from "../models/Configuracion";
import { fecha, log } from "../middlewares/log";

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

type DocChecks = Record<string, boolean>;
type DocFiles = Record<string, string>;

const normalizeDocChecks = (value?: Partial<DocChecks> | null): DocChecks => {
    const result: DocChecks = {};
    if (!value || typeof value !== "object") return result;
    Object.entries(value).forEach(([key, v]) => {
        result[key] = Boolean(v);
    });
    return result;
};

const normalizeDocFiles = (value?: Partial<DocFiles> | null): DocFiles => {
    const result: DocFiles = {};
    if (!value || typeof value !== "object") return result;
    Object.entries(value).forEach(([key, v]) => {
        result[key] = String(v || "");
    });
    return result;
};

const resolveDocKeysContratistas = async (): Promise<string[]> => {
    const config = await Configuracion.findOne(
        { activo: true },
        "documentos_contratistas documentos_personalizados"
    )
        .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
        .lean();
    const docConfig = ((config as any)?.documentos_contratistas || {}) as Record<string, boolean>;
    const defaultEnabled = DOC_KEYS.filter((key) => docConfig[key] !== false);
    const customRequired =
        (((config as any)?.documentos_personalizados?.contratistas?.obligatorios || []) as any[])
            .filter((d) => d?.activo !== false && d?.id)
            .map((d) => String(d.id));
    const customOptional =
        (((config as any)?.documentos_personalizados?.contratistas?.opcionales || []) as any[])
            .filter((d) => d?.activo !== false && d?.id)
            .map((d) => String(d.id));
    return [...defaultEnabled, ...customRequired, ...customOptional];
};

const obtenerContratistaDeUsuario = async (id_usuario: string) => {
    return Contratistas.findOne({ id_usuario, activo: true });
};

export async function obtenerMi(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const role = (req as UserRequest).role || [];

        let contratista = await obtenerContratistaDeUsuario(String(id_usuario));
        if (role.includes(1) && req.query?.contratista) {
            contratista = await Contratistas.findById(String(req.query.contratista));
        }
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const registro = await ContratistaDocumentos.findOne({ id_contratista: contratista._id }).lean();
        if (registro) {
            res.status(200).json({ estado: true, datos: registro });
            return;
        }

        res.status(200).json({
            estado: true,
            datos: {
                _id: null,
                id_contratista: contratista._id,
                id_empresa: contratista.id_empresa,
                empresa: contratista.empresa,
                documentos_archivos: {},
                documentos_checks: {},
                estado_validacion: 1,
                motivo_rechazo: "",
                fecha_validacion: null,
                validado_por: null,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function guardarMi(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const contratista = await obtenerContratistaDeUsuario(String(id_usuario));
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const documentos_archivos = normalizeDocFiles(req.body?.documentos_archivos || {});
        const docKeys = await resolveDocKeysContratistas();
        const documentos_checks = normalizeDocChecks(
            Object.fromEntries(
                docKeys.map((key) => [key, Boolean(documentos_archivos[key])])
            ) as Partial<DocChecks>
        );

        const update = {
            id_contratista: contratista._id,
            id_empresa: contratista.id_empresa,
            empresa: contratista.empresa,
            documentos_archivos,
            documentos_checks,
            estado_validacion: 1,
            motivo_rechazo: "",
            fecha_validacion: null as any,
            validado_por: null as any,
            modificado_por: id_usuario as any,
            fecha_modificacion: Date.now(),
        };

        const registro = await ContratistaDocumentos.findOneAndUpdate(
            { id_contratista: contratista._id },
            { $set: update, $setOnInsert: { creado_por: id_usuario, fecha_creacion: Date.now() } },
            { new: true, upsert: true }
        );

        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function verificar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id = String(req.params?.id || "");
        const documentos_checks = normalizeDocChecks(req.body?.documentos_checks || {});

        const registro = await ContratistaDocumentos.findByIdAndUpdate(
            id,
            {
                $set: {
                    documentos_checks,
                    estado_validacion: 2,
                    motivo_rechazo: "",
                    fecha_validacion: Date.now(),
                    validado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                    modificado_por: id_usuario,
                },
            },
            { new: true }
        );

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Registro no encontrado." });
            return;
        }

        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function rechazar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id = String(req.params?.id || "");
        const documentos_checks = normalizeDocChecks(req.body?.documentos_checks || {});
        const motivo_rechazo = String(req.body?.motivo_rechazo || "").trim();

        const registro = await ContratistaDocumentos.findByIdAndUpdate(
            id,
            {
                $set: {
                    documentos_checks,
                    estado_validacion: 3,
                    motivo_rechazo,
                    fecha_validacion: null,
                    validado_por: null,
                    fecha_modificacion: Date.now(),
                    modificado_por: id_usuario,
                },
            },
            { new: true }
        );

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Registro no encontrado." });
            return;
        }

        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function revertir(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id = String(req.params?.id || "");

        const registro = await ContratistaDocumentos.findByIdAndUpdate(
            id,
            {
                $set: {
                    estado_validacion: 1,
                    motivo_rechazo: "",
                    fecha_validacion: null,
                    validado_por: null,
                    fecha_modificacion: Date.now(),
                    modificado_por: id_usuario,
                },
            },
            { new: true }
        );

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Registro no encontrado." });
            return;
        }

        res.status(200).json({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
