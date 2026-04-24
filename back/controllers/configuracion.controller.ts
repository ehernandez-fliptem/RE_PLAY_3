import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { DecodedTokenUser } from '../types/jsonwebtoken';
import Configuracion from "../models/Configuracion";
import { fecha, log } from "../middlewares/log";

import { CONFIG } from "../config";
import { validarModelo } from "../validators/validadores";
import { flattenErrors, isEmptyObject, resizeImage } from "../utils/utils";
import TiposRegistros from "../models/TiposRegistros";
import TiposDocumentos from "../models/TiposDocumentos";
import TiposEventos from "../models/TiposEventos";
import Roles from "../models/Roles";
import TiposDispositivos from "../models/TiposDispositivos";
import Usuarios from "../models/Usuarios";
import DispositivosHv from "../models/DispositivosHv";

export async function obtenerIntegraciones(_req: Request, res: Response): Promise<void> {
    try {
        console.log("Obteniendo integraciones de configuración...");
        const registro = await Configuracion.findOne(
            { activo: true },
            "habilitarIntegracionHv habilitarIntegracionHvBiometria habilitarIntegracionCdvi habilitarContratistas habilitarRegistroCampo documentos_visitantes documentos_contratistas documentos_personalizados"
        ).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
        res.status(200).send({ estado: true, datos: registro });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarIntegraciones(req: Request, res: Response): Promise<void> {
    try {
        const {
            habilitarIntegracionHv,
            habilitarIntegracionHvBiometria,
            habilitarIntegracionCdvi,
            habilitarCamaras,
            habilitarContratistas,
            habilitarRegistroCampo,
            documentos_visitantes,
            documentos_contratistas,
            documentos_personalizados,
        } = req.body;
        const { id: id_usuario } = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;

        const normalizeDocConfig = (value?: Record<string, unknown> | null) => {
            if (!value || typeof value !== "object") return null;
            return {
                identificacion_oficial: Boolean((value as any).identificacion_oficial),
                sua: Boolean((value as any).sua),
                permiso_entrada: Boolean((value as any).permiso_entrada),
                lista_articulos: Boolean((value as any).lista_articulos),
                repse: Boolean((value as any).repse),
                soporte_pago_actualizado: Boolean((value as any).soporte_pago_actualizado),
                constancia_vigencia_imss: Boolean((value as any).constancia_vigencia_imss),
                constancias_habilidades: Boolean((value as any).constancias_habilidades),
            };
        };
        const normalizeCustomDocsList = (value?: unknown) => {
            if (!Array.isArray(value)) return [];
            return value
                .map((item: any) => {
                    const nombre = String(item?.nombre || "").trim();
                    const id = String(item?.id || "").trim();
                    if (!nombre || !id) return null;
                    return {
                        id,
                        nombre,
                        activo: Boolean(item?.activo),
                    };
                })
                .filter(Boolean);
        };
        const normalizeCustomDocsConfig = (value?: Record<string, any> | null) => {
            if (!value || typeof value !== "object") return null;
            return {
                contratistas: {
                    obligatorios: normalizeCustomDocsList((value as any)?.contratistas?.obligatorios),
                    opcionales: normalizeCustomDocsList((value as any)?.contratistas?.opcionales),
                },
                visitantes: {
                    obligatorios: normalizeCustomDocsList((value as any)?.visitantes?.obligatorios),
                    opcionales: normalizeCustomDocsList((value as any)?.visitantes?.opcionales),
                },
            };
        };

        const update: Record<string, unknown> = {
            habilitarIntegracionHv: !!habilitarIntegracionHv,
            habilitarIntegracionHvBiometria:
                typeof habilitarIntegracionHvBiometria === "boolean" ? habilitarIntegracionHvBiometria : undefined,
            habilitarCamaras: !!habilitarCamaras,
            habilitarContratistas:
                typeof habilitarContratistas === "boolean" ? habilitarContratistas : undefined,
            habilitarRegistroCampo: typeof habilitarRegistroCampo === "boolean" ? habilitarRegistroCampo : undefined,
            documentos_visitantes: normalizeDocConfig(documentos_visitantes) || undefined,
            documentos_contratistas: normalizeDocConfig(documentos_contratistas) || undefined,
            documentos_personalizados: normalizeCustomDocsConfig(documentos_personalizados) || undefined,
            modificado_por: id_usuario,
            fecha_modificacion: Date.now(),
        };
        if (typeof habilitarIntegracionCdvi === "boolean") {
            update.habilitarIntegracionCdvi = habilitarIntegracionCdvi;
        }
        if (update.habilitarIntegracionHvBiometria === undefined) {
            delete update.habilitarIntegracionHvBiometria;
        }
        if (!update.habilitarIntegracionHv) {
            update.habilitarIntegracionHvBiometria = false;
        }
        if (update.habilitarContratistas === undefined) {
            delete update.habilitarContratistas;
        }
        if (update.habilitarRegistroCampo === undefined) {
            delete update.habilitarRegistroCampo;
        }
        if (update.documentos_visitantes === undefined) {
            delete update.documentos_visitantes;
        }
        if (update.documentos_contratistas === undefined) {
            delete update.documentos_contratistas;
        }
        if (update.documentos_personalizados === undefined) {
            delete update.documentos_personalizados;
        }

        const configActiva = await Configuracion.findOne(
            { activo: true },
            "_id"
        ).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
        if (!configActiva?._id) {
            res.status(200).json({
                estado: false,
                mensaje: "No se encontró una configuración activa para actualizar integraciones.",
            });
            return;
        }
        const result = await Configuracion.updateOne(
            { _id: configActiva._id },
            { $set: update },
            { runValidators: false }
        );
        if (!result.matchedCount) {
            res.status(200).json({
                estado: false,
                mensaje: "No se encontró una configuración activa para actualizar integraciones.",
            });
            return;
        }

        if (update.habilitarIntegracionHvBiometria === false) {
            await DispositivosHv.updateMany({}, { $set: { es_panel_maestro: false } });
        }

        if (typeof habilitarContratistas === "boolean") {
            await Usuarios.updateMany(
                { rol: 11 },
                {
                    $set: {
                        activo: habilitarContratistas,
                        token_web: "",
                        token_app: "",
                    },
                }
            );
        }
        if (typeof habilitarRegistroCampo === "boolean") {
            await Usuarios.updateMany(
                habilitarRegistroCampo ? { rol: 12 } : { rol: [12] },
                {
                    $set: {
                        activo: habilitarRegistroCampo,
                        token_web: "",
                        token_app: "",
                    },
                }
            );
        }

        res.status(200).json({ estado: true, datos: update });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtener(_req: Request, res: Response): Promise<void> {
    try {
        const configuracion = await Configuracion.findOne(
            { activo: true },
            { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        ).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
        const tipos_eventos = await TiposEventos.find(
            { activo: true },
            { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_registros = await TiposRegistros.find(
            { activo: true },
            { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_dispositivos = await TiposDispositivos.find(
            { activo: true },
            { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_documentos = await TiposDocumentos.find(
            { activo: true },
            { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const roles = await Roles.find(
            { activo: true },
            { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        res.status(200).send({
            estado: true, datos: {
                configuracion,
                tipos_eventos,
                tipos_registros,
                tipos_dispositivos,
                tipos_documentos,
                roles
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { configuracion } = req.body;
        const registro = await Configuracion.countDocuments();
        const { id: id_usuario } = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;

        if (registro === 0) {
            const registro = new Configuracion({ ...configuracion, creado_por: id_usuario, fecha_creacion: Date.now(), imgCorreo: await resizeImage(configuracion.imgCorreo) });
            const mensajes = await validarModelo(registro);
            if (!isEmptyObject(mensajes)) {
                res.status(400).json({ estado: false, mensaje: "Revisa que los datos que estás ingresando sean correctos.", mensajes });
                return;
            }
            await registro.save();
        } else {
            await Configuracion
                .findOneAndUpdate({},
                    { $set: { ...configuracion, modificado_por: id_usuario, fecha_modificacion: Date.now(), imgCorreo: await resizeImage(configuracion.imgCorreo) } },
                    { runValidators: true, projection: { nombre: 1 } }
                )
                .catch(async (err) => {
                    const mensajes = await validarModelo(err, true);
                    if (!isEmptyObject(mensajes)) {
                        res.status(400).json({ estado: false, mensaje: "Revisa que los datos que estás ingresando sean correctos.", mensajes });
                        return;
                    }
                    res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
                });
            res.status(200).json({ estado: true });
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarColecciones(req: Request, res: Response): Promise<void> {
    try {
        const { tipos_registros, tipos_documentos, tipos_eventos, roles, tipos_dispositivos } = req.body;
        const { id: id_usuario } = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;

        const fecha_modificacion = Date.now();
        const result = await Promise.all([
            new Promise(async (resolve) => {
                let i = 0;
                const messages: Record<number, any> = {};
                for await (const reg of tipos_registros) {
                    try {
                        await TiposRegistros.findByIdAndUpdate(reg._id, { $set: { color: reg.color, fecha_modificacion, modificado_por: id_usuario } }, { runValidators: true })
                    } catch (err) {
                        const mensajes = await validarModelo(err as any, true);
                        if (!isEmptyObject(mensajes)) {
                            messages[i] = mensajes;
                        }
                    } finally {
                        i++;
                    }
                }
                resolve({ tipos_registros: messages });
            }),
            new Promise(async (resolve) => {
                let i = 0;
                const messages: Record<number, any> = {};
                for await (const reg of tipos_documentos) {
                    try {
                        await TiposDocumentos.findByIdAndUpdate(reg._id, { $set: { color: reg.color, fecha_modificacion, modificado_por: id_usuario } }, { runValidators: true })
                    } catch (err) {
                        const mensajes = await validarModelo(err as any, true);
                        if (!isEmptyObject(mensajes)) {
                            messages[i] = mensajes
                        }
                    } finally {
                        i++;
                    }
                }
                resolve({ tipos_documentos: messages });
            }),
            new Promise(async (resolve) => {
                let i = 0;
                const messages: Record<number, any> = {};
                for await (const reg of tipos_eventos) {
                    try {
                        await TiposEventos.findByIdAndUpdate(reg._id, { $set: { color: reg.color, fecha_modificacion, modificado_por: id_usuario } }, { runValidators: true })
                    } catch (err) {
                        const mensajes = await validarModelo(err as any, true);
                        if (!isEmptyObject(mensajes)) {
                            messages[i] = mensajes
                        }
                    } finally {
                        i++;
                    }
                }
                resolve({ tipos_eventos: messages });
            }),
            new Promise(async (resolve) => {
                let i = 0;
                const messages: Record<number, any> = {};
                for await (const reg of roles) {
                    try {
                        await Roles.findByIdAndUpdate(reg._id, { $set: { color: reg.color, fecha_modificacion, modificado_por: id_usuario } }, { runValidators: true })
                    } catch (err) {
                        const mensajes = await validarModelo(err as any, true);
                        if (!isEmptyObject(mensajes)) {
                            messages[i] = mensajes
                        }
                    } finally {
                        i++;
                    }
                }
                resolve({ roles: messages });
            }),
            new Promise(async (resolve) => {
                let i = 0;
                const messages: Record<number, any> = {};
                for await (const reg of tipos_dispositivos) {
                    try {
                        await TiposDispositivos.findByIdAndUpdate(reg._id, { $set: { color: reg.color, fecha_modificacion, modificado_por: id_usuario } }, { runValidators: true })
                    } catch (err) {
                        const mensajes = await validarModelo(err as any, true);
                        if (!isEmptyObject(mensajes)) {
                            messages[i] = mensajes
                        }
                    } finally {
                        i++;
                    }
                }
                resolve({ tipos_dispositivos: messages });
            })
        ]);
        const resultTyped = result as Record<string, Record<number, any>>[];
        const mensajes = flattenErrors(Object.assign({}, ...resultTyped));
        const existError = Object.values(mensajes).length > 0;
        if (existError) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }

        (async (res: Response) => {
            const tipos_eventos = await TiposEventos.find(
                { activo: true },
                { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
            );
            const tipos_registros = await TiposRegistros.find(
                { activo: true },
                { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
            );
            const tipos_dispositivos = await TiposDispositivos.find(
                { activo: true },
                { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
            );
            const tipos_documentos = await TiposDocumentos.find(
                { activo: true },
                { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
            );
            const roles = await Roles.find(
                { activo: true },
                { activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
            );
            res.status(200).send({
                estado: true, datos: {
                    tipos_eventos,
                    tipos_registros,
                    tipos_dispositivos,
                    tipos_documentos,
                    roles
                }
            });
        })(res)
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

