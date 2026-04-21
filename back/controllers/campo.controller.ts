import { Request, Response } from "express";
import { Types } from "mongoose";
import Empleados from "../models/Empleados";
import RegistrosCampo from "../models/RegistrosCampo";
import Configuracion from "../models/Configuracion";
import Usuarios from "../models/Usuarios";
import { UserRequest } from "../types/express";
import { fecha, log } from "../middlewares/log";

function normalizarTipo(v: unknown): "IN" | "OUT" | null {
    if (!v) return null;
    const value = String(v).trim().toUpperCase();
    if (value === "IN" || value === "OUT") return value;
    return null;
}

function siguienteTipo(ultimoTipo?: string | null): "IN" | "OUT" {
    return ultimoTipo === "IN" ? "OUT" : "IN";
}

async function resolverEmpleadoDesdeSesion(idUsuario: Types.ObjectId | string) {
    const usuario = await Usuarios.findById(idUsuario, "correo rol activo");
    if (!usuario || !usuario.activo) return null;
    const empleado = await Empleados.findOne(
        { correo: usuario.correo?.trim().toLowerCase(), activo: true },
        "_id id_empleado nombre apellido_pat apellido_mat acceso_campo usuario_campo_activo activo"
    ).lean();
    if (!empleado) return null;
    return { usuario, empleado };
}

export async function obtenerEstadoCampo(req: Request, res: Response): Promise<void> {
    try {
        const idUsuario = (req as UserRequest).userId;
        const rol = (req as UserRequest).role || [];

        const config = await Configuracion.findOne({}, "habilitarRegistroCampo").lean();
        if (!config?.habilitarRegistroCampo) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_DISABLED",
                mensaje: "El módulo de registro de campo está desactivado.",
            });
            return;
        }

        const contexto = await resolverEmpleadoDesdeSesion(idUsuario);
        if (!contexto) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_EMP_NOT_FOUND",
                mensaje: "No se encontró un empleado asociado a esta cuenta.",
            });
            return;
        }
        const { empleado } = contexto;

        if (!rol.includes(1) && !empleado.acceso_campo) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_EMP_DISABLED",
                mensaje: "Tu cuenta no tiene acceso al módulo de campo.",
            });
            return;
        }

        const ultimo = await RegistrosCampo.findOne(
            { id_empleado: empleado._id },
            "tipo fecha_hora_servidor latitud longitud precision"
        )
            .sort({ fecha_hora_servidor: -1, _id: -1 })
            .lean();

        const siguiente = siguienteTipo(ultimo?.tipo || null);

        res.status(200).json({
            estado: true,
            datos: {
                id_empleado: empleado._id,
                empleado: {
                    id_empleado: empleado.id_empleado,
                    nombre: `${empleado.nombre} ${empleado.apellido_pat || ""} ${empleado.apellido_mat || ""}`.trim(),
                },
                siguiente,
                ultimo: ultimo || null,
                habilitado: true,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function registrarMovimientoCampo(req: Request, res: Response): Promise<void> {
    try {
        const idUsuario = (req as UserRequest).userId;
        const rol = (req as UserRequest).role || [];
        const { tipo, latitud, longitud, precision, foto } = req.body || {};

        const tipoNormalizado = normalizarTipo(tipo);
        if (!tipoNormalizado) {
            res.status(400).json({ estado: false, mensaje: "El tipo de movimiento es inválido (IN/OUT)." });
            return;
        }
        if (latitud === undefined || longitud === undefined || !foto) {
            res.status(400).json({
                estado: false,
                mensaje: "Faltan datos obligatorios para registro de campo.",
                mensajes: {
                    latitud: latitud === undefined ? "La ubicación es obligatoria." : "",
                    longitud: longitud === undefined ? "La ubicación es obligatoria." : "",
                    foto: !foto ? "La foto es obligatoria." : "",
                },
            });
            return;
        }
        const lat = Number(latitud);
        const lng = Number(longitud);
        const precisionNum = precision === undefined || precision === null ? null : Number(precision);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
            res.status(400).json({ estado: false, mensaje: "La ubicación enviada es inválida." });
            return;
        }
        if (precisionNum !== null && (!Number.isFinite(precisionNum) || precisionNum < 0)) {
            res.status(400).json({ estado: false, mensaje: "La precisión enviada es inválida." });
            return;
        }

        const config = await Configuracion.findOne({}, "habilitarRegistroCampo").lean();
        if (!config?.habilitarRegistroCampo) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_DISABLED",
                mensaje: "El módulo de registro de campo está desactivado.",
            });
            return;
        }

        const contexto = await resolverEmpleadoDesdeSesion(idUsuario);
        if (!contexto) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_EMP_NOT_FOUND",
                mensaje: "No se encontró un empleado asociado a esta cuenta.",
            });
            return;
        }
        const { empleado } = contexto;
        if (!rol.includes(1) && !empleado.acceso_campo) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_EMP_DISABLED",
                mensaje: "Tu cuenta no tiene acceso al módulo de campo.",
            });
            return;
        }

        const ultimo = await RegistrosCampo.findOne({ id_empleado: empleado._id }, "tipo")
            .sort({ fecha_hora_servidor: -1, _id: -1 })
            .lean();
        const esperado = siguienteTipo(ultimo?.tipo || null);
        if (tipoNormalizado !== esperado) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_INVALID_SEQUENCE",
                mensaje: `Secuencia inválida. El siguiente movimiento permitido es ${esperado}.`,
                datos: { esperado, ultimo: ultimo?.tipo || null },
            });
            return;
        }

        const registro = new RegistrosCampo({
            id_empleado: empleado._id,
            id_usuario: idUsuario,
            tipo: tipoNormalizado,
            fecha_hora_servidor: new Date(),
            latitud: lat,
            longitud: lng,
            precision: precisionNum,
            foto,
            origen: "web",
            estatus: "ok",
        });
        await registro.save();

        res.status(200).json({
            estado: true,
            datos: {
                _id: registro._id,
                tipo: registro.tipo,
                fecha_hora_servidor: registro.fecha_hora_servidor,
                siguiente: siguienteTipo(registro.tipo),
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerReportesCampo(req: Request, res: Response): Promise<void> {
    try {
        const { fecha_desde, fecha_hasta, id_empleado } = req.query as Record<string, string>;
        const match: Record<string, unknown> = {};
        const rango: Record<string, Date> = {};
        if (fecha_desde) {
            const start = new Date(fecha_desde);
            if (!Number.isNaN(start.getTime())) rango.$gte = start;
        }
        if (fecha_hasta) {
            const end = new Date(fecha_hasta);
            if (!Number.isNaN(end.getTime())) rango.$lte = end;
        }
        if (Object.keys(rango).length) {
            match.fecha_hora_servidor = rango;
        }
        if (id_empleado && Types.ObjectId.isValid(id_empleado)) {
            match.id_empleado = new Types.ObjectId(id_empleado);
        }

        const registros = await RegistrosCampo.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "empleados",
                    localField: "id_empleado",
                    foreignField: "_id",
                    as: "empleado",
                    pipeline: [
                        {
                            $project: {
                                id_empleado: 1,
                                nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] },
                                correo: 1,
                            },
                        },
                    ],
                },
            },
            { $set: { empleado: { $arrayElemAt: ["$empleado", 0] } } },
            { $sort: { fecha_hora_servidor: -1, _id: -1 } },
            {
                $project: {
                    tipo: 1,
                    fecha_hora_servidor: 1,
                    latitud: 1,
                    longitud: 1,
                    precision: 1,
                    origen: 1,
                    empleado: 1,
                },
            },
        ]);

        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerMisRegistrosCampo(req: Request, res: Response): Promise<void> {
    try {
        const idUsuario = (req as UserRequest).userId;
        const rol = (req as UserRequest).role || [];
        const contexto = await resolverEmpleadoDesdeSesion(idUsuario);
        if (!contexto) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_EMP_NOT_FOUND",
                mensaje: "No se encontró un empleado asociado a esta cuenta.",
            });
            return;
        }
        const { empleado } = contexto;
        if (!rol.includes(1) && !empleado.acceso_campo) {
            res.status(200).json({
                estado: false,
                codigo: "CAMPO_EMP_DISABLED",
                mensaje: "Tu cuenta no tiene acceso al módulo de campo.",
            });
            return;
        }

        const limiteRaw = Number((req.query?.limite as string) || 8);
        const limite = Number.isFinite(limiteRaw) ? Math.min(Math.max(limiteRaw, 1), 30) : 8;

        const registros = await RegistrosCampo.find(
            { id_empleado: empleado._id },
            "tipo fecha_hora_servidor latitud longitud precision origen estatus"
        )
            .sort({ fecha_hora_servidor: -1, _id: -1 })
            .limit(limite)
            .lean();

        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
