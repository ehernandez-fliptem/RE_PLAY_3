import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import bcrypt from "bcrypt";
import { UserRequest } from "../types/express";
import { QueryParams } from "../types/queryparams";
import Contratistas from "../models/Contratistas";
import Usuarios, { IUsuario } from "../models/Usuarios";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, generarCodigoUnico, isEmptyObject, cleanObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import { enviarCorreoContratistaAcceso } from "../utils/correos";

const ROL_CONTRATISTA = 11;

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { id_empresa } = await Usuarios.findById(id_usuario, "id_empresa") as IUsuario;

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
            customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["empresa", "nombre", "correo"]);

        const aggregation: PipelineStage[] = [
            { $match: { id_empresa } },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuario",
                    pipeline: [
                        {
                            $project: {
                                correo: 1,
                                nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] },
                            },
                        },
                    ],
                },
            },
            { $set: { usuario: { $arrayElemAt: ["$usuario", 0] } } },
            { $set: { nombre: "$usuario.nombre", correo: "$usuario.correo" } },
            {
                $project: {
                    empresa: 1,
                    correos: 1,
                    telefono: 1,
                    activo: 1,
                    nombre: 1,
                    correo: 1,
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

        const registros = await Contratistas.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { id_empresa } = await Usuarios.findById(id_usuario, "id_empresa") as IUsuario;
        const registros = await Contratistas.find({ id_empresa, activo: true }, "empresa correos telefono").sort({ empresa: 1 });
        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Contratistas.aggregate([
            { $match: { _id: new Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuario",
                    pipeline: [
                        {
                            $project: {
                                correo: 1,
                                nombre: 1,
                                apellido_pat: 1,
                                apellido_mat: 1,
                            },
                        },
                    ],
                },
            },
            { $set: { usuario: { $arrayElemAt: ["$usuario", 0] } } },
            {
                $set: {
                    "usuario.nombre_completo": {
                        $trim: {
                            input: {
                                $concat: [
                                    "$usuario.nombre",
                                    " ",
                                    "$usuario.apellido_pat",
                                    " ",
                                    "$usuario.apellido_mat",
                                ],
                            },
                        },
                    },
                },
            },
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { empresa, correos, telefono, nombre, apellido_pat, apellido_mat, correo } = req.body;
        const id_usuario = (req as UserRequest).userId;

        if (!empresa || !correo || !nombre || !apellido_pat) {
            res.status(200).json({ estado: false, mensaje: "Faltan campos obligatorios." });
            return;
        }

        const { id_empresa } = await Usuarios.findById(id_usuario, "id_empresa") as IUsuario;
        const correoNormalizado = String(correo).trim().toLowerCase();

        const existeCorreo = await Usuarios.findOne({ correo: correoNormalizado }, "_id").lean();
        if (existeCorreo) {
            res.status(200).json({ estado: false, mensaje: "El correo ya está registrado." });
            return;
        }

        const contrasena = generarCodigoUnico(12, true);
        const hash = bcrypt.hashSync(contrasena, 10);
        if (!hash) {
            res.status(500).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
            return;
        }

        const nuevoUsuario = new Usuarios({
            correo: correoNormalizado,
            contrasena: hash,
            nombre,
            apellido_pat,
            apellido_mat,
            rol: [ROL_CONTRATISTA],
            id_empresa,
            esRoot: false,
            creado_por: id_usuario,
        });

        const mensajesUsuario = await validarModelo(nuevoUsuario);
        if (!isEmptyObject(mensajesUsuario)) {
            res.status(400).json({ estado: false, mensaje: "Revisa que los datos del usuario sean correctos.", mensajes: mensajesUsuario });
            return;
        }

        const nuevoContratista = new Contratistas({
            empresa,
            correos: Array.isArray(correos) ? correos : [],
            telefono,
            id_usuario: nuevoUsuario._id,
            id_empresa,
            creado_por: id_usuario,
        });

        const mensajesContratista = await validarModelo(nuevoContratista);
        if (!isEmptyObject(mensajesContratista)) {
            res.status(400).json({ estado: false, mensaje: "Revisa que los datos del contratista sean correctos.", mensajes: mensajesContratista });
            return;
        }

        const userSaved = await nuevoUsuario.save();
        try {
            await nuevoContratista.save();
        } catch (error) {
            await Usuarios.findByIdAndDelete(userSaved._id);
            throw error;
        }

        const resultEnvioUsuario = await enviarCorreoContratistaAcceso(
            correoNormalizado,
            contrasena,
            empresa,
            `${nombre} ${apellido_pat} ${apellido_mat}`.replace(/\s+/g, " ").trim()
        );

        res.status(200).json({ estado: true, datos: { contratista: true, correoUsuario: resultEnvioUsuario } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { empresa, correos, telefono, nombre, apellido_pat, apellido_mat, correo } = req.body;
        const id_usuario = (req as UserRequest).userId;

        const contratista = await Contratistas.findById(req.params.id);
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const updateUsuario: any = cleanObject({
            nombre,
            apellido_pat,
            apellido_mat,
            correo: correo ? String(correo).trim().toLowerCase() : undefined,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
        });

        if (updateUsuario.correo) {
            const existeCorreo = await Usuarios.findOne({
                correo: updateUsuario.correo,
                _id: { $ne: contratista.id_usuario },
            }, "_id").lean();
            if (existeCorreo) {
                res.status(200).json({ estado: false, mensaje: "El correo ya está registrado." });
                return;
            }
        }

        if (!isEmptyObject(updateUsuario)) {
            await Usuarios.findByIdAndUpdate(contratista.id_usuario, { $set: updateUsuario });
        }

        const updateContratista: any = cleanObject({
            empresa,
            correos: Array.isArray(correos) ? correos : undefined,
            telefono,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
        });

        const registro = await Contratistas.findByIdAndUpdate(req.params.id, { $set: updateContratista }, { new: true, runValidators: true });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
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
        const { activo } = req.body;
        const registro = await Contratistas.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } }, { new: true });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }
        await Usuarios.findByIdAndUpdate(registro.id_usuario, { $set: { activo: !activo } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function reenviarCorreoAcceso(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const contratista = await Contratistas.findById(req.params.id, "empresa id_usuario correos").lean();
        if (!contratista) {
            res.status(200).json({ estado: false, mensaje: "Contratista no encontrado." });
            return;
        }

        const usuario = await Usuarios.findById(
            contratista.id_usuario,
            "correo id_general activo nombre apellido_pat apellido_mat"
        ).lean();
        if (!usuario) {
            res.status(200).json({ estado: false, mensaje: "Usuario manager no encontrado." });
            return;
        }

        const contrasena = generarCodigoUnico(12, true);
        const hash = bcrypt.hashSync(contrasena, 10);
        if (!hash) {
            res.status(500).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
            return;
        }

        await Usuarios.findByIdAndUpdate(usuario._id, {
            $set: {
                contrasena: hash,
                fecha_modificacion: Date.now(),
                modificado_por: id_usuario,
            },
        });

        const destinatarios = Array.from(
            new Set(
                [
                    String(usuario.correo || "").trim().toLowerCase(),
                    ...(Array.isArray(contratista.correos)
                        ? contratista.correos.map((item: any) =>
                              String(item || "").trim().toLowerCase()
                          )
                        : []),
                ].filter(Boolean)
            )
        );

        if (destinatarios.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay correos destino configurados para reenviar acceso.",
            });
            return;
        }

        const resultados: { correo: string; enviado: boolean }[] = [];
        for (const destino of destinatarios) {
            const enviado = await enviarCorreoContratistaAcceso(
                destino,
                contrasena,
                String(contratista.empresa || ""),
                `${String((usuario as any).nombre || "")} ${String((usuario as any).apellido_pat || "")} ${String((usuario as any).apellido_mat || "")}`
                    .replace(/\s+/g, " ")
                    .trim()
            );
            resultados.push({ correo: destino, enviado });
        }

        const fallidos = resultados.filter((item) => !item.enviado).map((item) => item.correo);
        if (fallidos.length > 0) {
            res.status(200).json({
                estado: false,
                mensaje: `No se pudo enviar a: ${fallidos.join(", ")}`,
                datos: { resultados },
            });
            return;
        }

        res.status(200).json({ estado: true, datos: { correoUsuario: true, resultados } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
