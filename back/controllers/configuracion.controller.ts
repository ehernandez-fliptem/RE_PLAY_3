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

const MODULOS_SISTEMA = [
    "kiosco",
    "usuarios",
    "empleados",
    "campo",
    "visitantes",
    "portal_contratistas",
    "contratistas",
    "directorio",
    "eventos",
    "escaner_qr",
    "catalogos",
    "dispositivos_hikvision",
    "camaras",
    "biostar",
    "configuracion",
    "permisos",
] as const;

const MODULOS_POR_ROL_PREDETERMINADO: Record<number, string[]> = {
    1: [...MODULOS_SISTEMA],
    2: [
        "eventos",
        "kiosco",
        "empleados",
        "visitantes",
        "contratistas",
        "directorio",
        "catalogos",
        "biostar",
    ],
    4: ["visitantes"],
    5: ["eventos", "kiosco", "visitantes"],
    6: [],
    7: [],
    10: [],
    11: ["portal_contratistas"],
    12: ["campo"],
    13: ["kiosco", "visitantes", "eventos", "escaner_qr"],
};

const MODULO_INICIO_POR_ROL_PREDETERMINADO: Record<number, string> = {
    1: "eventos",
    2: "eventos",
    4: "visitantes",
    5: "eventos",
    11: "portal_contratistas",
    12: "campo",
    13: "kiosco",
};

function normalizarPermisosRoles(permisosActuales: any, rolesCatalogo: Array<{ rol: number }>) {
    const base = Array.isArray(permisosActuales) ? permisosActuales : [];
    const byRol = new Map<number, any>();
    base.forEach((item: any) => {
        if (typeof item?.rol === "number") byRol.set(item.rol, item);
    });

    return rolesCatalogo.map((r) => {
        const actual = byRol.get(r.rol);
        const modulosObj: Record<string, boolean> = {};
        const defaults = MODULOS_POR_ROL_PREDETERMINADO[r.rol] || [];
        MODULOS_SISTEMA.forEach((m) => {
            const actualValue = actual?.modulos && typeof actual.modulos === "object" ? actual.modulos[m] : undefined;
            modulosObj[m] = typeof actualValue === "boolean" ? actualValue : defaults.includes(m);
        });
        const inicioActual = String(actual?.modulo_inicio || "").trim();
        const inicioPorRol = MODULO_INICIO_POR_ROL_PREDETERMINADO[r.rol] || "";
        const modulo_inicio =
            inicioActual && modulosObj[inicioActual]
                ? inicioActual
                : (inicioPorRol && modulosObj[inicioPorRol]
                    ? inicioPorRol
                    : (defaults.find((m) => modulosObj[m]) || ""));
        return {
            rol: r.rol,
            modulo_inicio,
            modulos: modulosObj,
        };
    });
}

function rolesPermitidosSegunIntegraciones(
    flags: { contratistas?: boolean; campo?: boolean },
    rolesCatalogo: Array<{ rol: number }>
) {
    const base = new Set<number>([1, 2, 4, 5, 13]);
    const legacyOcultos = new Set<number>([6, 7, 10]);
    if (flags.contratistas) base.add(11);
    if (flags.campo) base.add(12);

    for (const r of rolesCatalogo) {
        const rolNum = Number(r.rol);
        if (!Number.isFinite(rolNum)) continue;
        if (legacyOcultos.has(rolNum)) continue;
        if (rolNum === 11 && !flags.contratistas) continue;
        if (rolNum === 12 && !flags.campo) continue;
        base.add(rolNum);
    }
    return Array.from(base);
}

function normalizarPermisosRolesFiltrados(
    permisosActuales: any,
    rolesCatalogo: Array<{ rol: number }>,
    flags: { contratistas?: boolean; campo?: boolean }
) {
    const rolesPermitidos = new Set(rolesPermitidosSegunIntegraciones(flags, rolesCatalogo));
    const rolesFiltrados = rolesCatalogo.filter((r) => rolesPermitidos.has(Number(r.rol)));
    return normalizarPermisosRoles(permisosActuales, rolesFiltrados);
}

export async function obtenerIntegraciones(_req: Request, res: Response): Promise<void> {
    try {
        console.log("Obteniendo integraciones de configuración...");
        const registro = await Configuracion.findOne(
            { activo: true },
            "habilitarIntegracionHv habilitarIntegracionBiostar habilitarIntegracionHvBiometria habilitarIntegracionCdvi habilitarContratistas habilitarRegistroCampo documentos_visitantes documentos_contratistas documentos_personalizados"
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
            habilitarIntegracionBiostar,
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
            habilitarIntegracionBiostar: !!habilitarIntegracionBiostar,
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
        const configJson: any = configuracion ? (configuracion as any).toObject?.() ?? configuracion : {};
        const envCuentaActiva = !!(
            CONFIG.MAIL_VISITANTES_ID &&
            CONFIG.MAIL_VISITANTES_USER &&
            CONFIG.MAIL_VISITANTES_PASS &&
            CONFIG.MAIL_VISITANTES_HOST
        );
        if (envCuentaActiva) {
            const envCuenta = {
                id: CONFIG.MAIL_VISITANTES_ID,
                nombre: CONFIG.MAIL_VISITANTES_NOMBRE || CONFIG.MAIL_VISITANTES_ID,
                proveedor: CONFIG.MAIL_VISITANTES_PROVIDER || "gmail",
                host: CONFIG.MAIL_VISITANTES_HOST,
                port: Number(CONFIG.MAIL_VISITANTES_PORT || 587),
                secure: !!CONFIG.MAIL_VISITANTES_SECURE,
                requireTLS: CONFIG.MAIL_VISITANTES_REQUIRE_TLS !== false,
                user: CONFIG.MAIL_VISITANTES_USER,
                pass: CONFIG.MAIL_VISITANTES_PASS,
                fromName: CONFIG.MAIL_VISITANTES_FROM_NAME || "Flipbot",
                fromEmail: CONFIG.MAIL_VISITANTES_FROM_EMAIL || CONFIG.MAIL_VISITANTES_USER,
                activo: true,
            };
            const actuales = Array.isArray(configJson?.correo_cuentas) ? configJson.correo_cuentas : [];
            const sinDuplicado = actuales.filter((c: any) => c?.id !== envCuenta.id);
            configJson.correo_cuentas = [...sinDuplicado, envCuenta];
            const cuentaVisitantesActual = configJson?.correo_visitantes_cuenta_id;
            if (
                CONFIG.MAIL_VISITANTES_DEFAULT_FOR_TEMPLATE &&
                (cuentaVisitantesActual === undefined || cuentaVisitantesActual === null)
            ) {
                configJson.correo_visitantes_cuenta_id = envCuenta.id;
            }
        }
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
        const rolesLite = roles.map((r: any) => ({ rol: Number(r.rol) }));
        configJson.permisos_roles = normalizarPermisosRolesFiltrados(
            configJson?.permisos_roles,
            rolesLite,
            {
                contratistas: !!configJson?.habilitarContratistas,
                campo: !!configJson?.habilitarRegistroCampo,
            }
        );
        res.status(200).send({
            estado: true, datos: {
                configuracion: configJson,
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

        const rolesCatalogo = await Roles.find({ activo: true }, { rol: 1 }).lean<any[]>();
        const configEntrada = {
            ...configuracion,
            permisos_roles: normalizarPermisosRolesFiltrados(
                configuracion?.permisos_roles,
                rolesCatalogo.map((r) => ({ rol: Number(r.rol) })),
                {
                    contratistas: typeof configuracion?.habilitarContratistas === "boolean"
                        ? configuracion.habilitarContratistas
                        : true,
                    campo: typeof configuracion?.habilitarRegistroCampo === "boolean"
                        ? configuracion.habilitarRegistroCampo
                        : false,
                }
            ),
        };

        if (registro === 0) {
            const registro = new Configuracion({ ...configEntrada, creado_por: id_usuario, fecha_creacion: Date.now(), imgCorreo: await resizeImage(configEntrada.imgCorreo) });
            const mensajes = await validarModelo(registro);
            if (!isEmptyObject(mensajes)) {
                res.status(400).json({ estado: false, mensaje: "Revisa que los datos que estás ingresando sean correctos.", mensajes });
                return;
            }
            await registro.save();
        } else {
            await Configuracion
                .findOneAndUpdate({},
                    { $set: { ...configEntrada, modificado_por: id_usuario, fecha_modificacion: Date.now(), imgCorreo: await resizeImage(configEntrada.imgCorreo) } },
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

