import { Request, Response } from "express";
import { UserRequest } from "../types/express";
import Contratistas from "../models/Contratistas";
import ContratistaDocumentos from "../models/ContratistaDocumentos";
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

type DocChecks = Record<(typeof DOC_KEYS)[number], boolean>;
type DocFiles = Record<(typeof DOC_KEYS)[number], string>;

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

        const registro = await ContratistaDocumentos.findOne({ id_contratista: contratista._id });
        res.status(200).json({ estado: true, datos: registro });
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
        const documentos_checks = normalizeDocChecks(
            Object.fromEntries(
                DOC_KEYS.map((key) => [key, Boolean(documentos_archivos[key])])
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
