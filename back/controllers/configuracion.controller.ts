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

export async function obtenerIntegraciones(_req: Request, res: Response): Promise<void> {
    try {
        console.log("Obteniendo integraciones de configuración...");
        const registro = await Configuracion.findOne(
            {},
            "habilitarIntegracionHv habilitarIntegracionCdvi habilitarContratistas documentos_visitantes documentos_contratistas"
        );
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
            habilitarIntegracionCdvi,
            habilitarCamaras,
            habilitarContratistas,
            documentos_visitantes,
            documentos_contratistas,
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

        const update: Record<string, unknown> = {
            habilitarIntegracionHv: !!habilitarIntegracionHv,
            habilitarCamaras: !!habilitarCamaras,
            habilitarContratistas:
                typeof habilitarContratistas === "boolean" ? habilitarContratistas : undefined,
            documentos_visitantes: normalizeDocConfig(documentos_visitantes) || undefined,
            documentos_contratistas: normalizeDocConfig(documentos_contratistas) || undefined,
            modificado_por: id_usuario,
            fecha_modificacion: Date.now(),
        };
        if (typeof habilitarIntegracionCdvi === "boolean") {
            update.habilitarIntegracionCdvi = habilitarIntegracionCdvi;
        }
        if (update.habilitarContratistas === undefined) {
            delete update.habilitarContratistas;
        }
        if (update.documentos_visitantes === undefined) {
            delete update.documentos_visitantes;
        }
        if (update.documentos_contratistas === undefined) {
            delete update.documentos_contratistas;
        }

        await Configuracion.updateOne({}, { $set: update }, { upsert: true, runValidators: false });

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
        );
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
