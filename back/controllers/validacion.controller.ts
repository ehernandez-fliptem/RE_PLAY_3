import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { PipelineStage, Types } from 'mongoose';
import QRCode from 'qrcode';
import Visitantes from "../models/Visitantes";
import Usuarios from "../models/Usuarios";
import Configuracion from "../models/Configuracion";
import TiposEventos from "../models/TiposEventos";
import Roles from "../models/Roles";
import TiposRegistros from "../models/TiposRegistros";
import Empresas, { IContacto, IEmpresa } from "../models/Empresas";
import Pisos from "../models/Pisos";
import TiposDispositivos from "../models/TiposDispositivos";
import Accesos from "../models/Accesos";
import TiposDocumentos from "../models/TiposDocumentos";
import { UserRequest } from "../types/express";
import { fecha, log } from "../middlewares/log";
import { validarModelo } from "../validators/validadores";
import { customAggregationForDataGrids, isEmptyObject, resizeImage } from "../utils/utils";
import { enviarCorreoUsuario } from "../utils/correos";
import { QueryParams } from "../types/queryparams";
import FaceDetector from "../classes/FaceDetector";

const faceDetector = new FaceDetector();


export async function validarApp(_req: Request, res: Response): Promise<void> {
    try {
        const configuracion = await Configuracion.countDocuments({});
        const usuarios = await Usuarios.countDocuments({});
        const empresas = await Empresas.countDocuments({});
        const pisos = await Pisos.countDocuments({});
        const accesos = await Accesos.countDocuments({});
        res.status(200).json({ estado: true, datos: { configuracion, usuarios, empresas, pisos, accesos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerInformacioAppYSesion(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const device = (req as UserRequest).device.type;
        const DEVICE_TYPES: Record<string, string> = {
            desktop: "token_web",
            tv: "token_web",
            tablet: "token_app",
            phone: "token_app",
            bot: "token_app",
            car: "token_web",
        };
        let registro = null;
        registro = (await Usuarios.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(id_usuario),
                },
            },
            {
                $set: {
                    token: `$${[DEVICE_TYPES[device]]}`,
                },
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos",
                    foreignField: "_id",
                    as: "accesos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "empresas",
                    localField: "id_empresa",
                    foreignField: "_id",
                    as: "empresa",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                img_empresa: 1
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    empresa: { $arrayElemAt: ["$empresa", 0] },
                }
            },
            {
                $project: {
                    id_general: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                    },
                    esRoot: 1,
                    rol: 1,
                    token: 1,
                    img_usuario: 1,
                    accesos: 1,
                    empresa: 1
                },
            },
        ]))[0];
        registro = registro || (await Visitantes.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(id_usuario),
                },
            },
            {
                $set: {
                    token: `$${[DEVICE_TYPES[device]]}`,
                },
            },
            {
                $project: {
                    id_general: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                    },
                    rol: 1,
                    token: 1,
                    img_usuario: 1,
                },
            },
        ]))[0];
        if (!registro?.token) {
            res.status(419).json({ estado: false, mensaje: "La sesión ha expirado, por favor inicie sesión de nuevo." });
            return;
        }
        const configuracion = await Configuracion.findOne(
            { activo: true },
            { _id: 0, activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_eventos = await TiposEventos.find(
            { activo: true },
            { _id: 0, activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_registros = await TiposRegistros.find(
            { activo: true },
            { _id: 0, activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_dispositivos = await TiposDispositivos.find(
            { activo: true },
            { _id: 0, activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const tipos_documentos = await TiposDocumentos.find(
            { activo: true },
            { _id: 0, activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        const roles = await Roles.find(
            { activo: true },
            { _id: 0, activo: 0, creado_por: 0, fecha_creacion: 0, modificado_por: 0, fecha_modificacion: 0 }
        );
        res.status(200).json({
            estado: true,
            datos: {
                configuracion,
                tipos_eventos,
                tipos_registros,
                tipos_dispositivos,
                tipos_documentos,
                roles,
                usuario: registro,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosPisos(req: Request, res: Response): Promise<void> {
    try {
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre", "identificador"]
        );
        const aggregation: PipelineStage[] = [
            {
                $project: {
                    nombre: 1,
                    identificador: 1,
                }
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB
                }
            });
        }
        aggregation.push(
            {
                $sort: sortMDB ? sortMDB : { identificador: 1 }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        )
        const registros = await Pisos.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosAccesos(req: Request, res: Response): Promise<void> {
    try {
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre", "identificador"]
        );
        const aggregation: PipelineStage[] = [
            {
                $project: {
                    nombre: 1,
                    identificador: 1,
                }
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB
                }
            });
        }
        aggregation.push(
            {
                $sort: sortMDB ? sortMDB : { identificador: 1 }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        )
        const registros = await Accesos.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevaEmpresa(_req: Request, res: Response): Promise<void> {
    try {
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const pisos = await Pisos.find({}, 'identificador nombre activo').sort({ nombre: 1 });
        const accesos = await Accesos.find({}, 'identificador nombre activo').sort({ nombre: 1 });
        const tipos_documentos = await TiposDocumentos.find({ activo: true }, "nombre tipo");
        res.status(200).json({ estado: true, datos: { pisos, accesos, tipos_documentos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormNuevoUsuario(_req: Request, res: Response): Promise<void> {
    try {
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const empresa = await Empresas.findOne({ esRoot: true }, '_id') as IEmpresa;
        if (!empresa?._id) {
            res.status(200).json({ estado: false, mensaje: "No se ha definido la empresa." });
            return;
        }
        const pisos = await Pisos.find({ empresas: { $in: [empresa._id] } }, 'identificador nombre activo').sort({ nombre: 1 });
        const accesos = await Accesos.find({ empresas: { $in: [empresa._id] } }, 'identificador nombre activo').sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: { pisos, accesos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function crearPiso(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, identificador } = req.body;
        const registro = new Pisos({
            nombre,
            identificador,
            creado_por: null,
        });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes,
            });
            return;
        }
        await registro.save();
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crearAcceso(req: Request, res: Response): Promise<void> {
    try {
        const { img_acceso, nombre, identificador } = req.body;
        const registro = new Accesos({
            img_acceso,
            nombre,
            identificador,
            creado_por: null,
        });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes,
            });
            return;
        }
        await registro.save();
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function eliminarPiso(req: Request, res: Response): Promise<void> {
    try {
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const pisoDeleted = await Pisos.findByIdAndDelete(req.params.id);
        if (!pisoDeleted) {
            res.status(200).json({ estado: false, mensaje: "Piso no encontrada" });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function eliminarAcceso(req: Request, res: Response): Promise<void> {
    try {
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const accesoDeleted = await Accesos.findByIdAndDelete(req.params.id);
        if (!accesoDeleted) {
            res.status(200).json({ estado: false, mensaje: "Acceso no encontrada" });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crearEmpresa(req: Request, res: Response): Promise<void> {
    try {
        const { img_empresa, nombre, rfc, telefonos, pisos, accesos, documentos } = req.body;
        const telefonosFormatter = telefonos.map((item: IContacto) => { return { _id: new Types.ObjectId(), numero: item.numero, extension: item.extension } });
        const registro = new Empresas({
            img_empresa: img_empresa ? await resizeImage(img_empresa) : "",
            nombre,
            rfc,
            telefonos: telefonosFormatter,
            pisos,
            accesos,
            documentos,
            esRoot: true,
            creado_por: null,
        });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes,
            });
            return;
        }
        await registro.save();
        await Accesos.updateMany({ _id: { $in: accesos } }, { $push: { empresas: registro._id } });
        await Pisos.updateMany({ _id: { $in: pisos } }, { $push: { empresas: registro._id } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crearUsuario(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, correo, contrasena, movil, telefono, extension, id_piso, accesos } = req.body;
        const countUsuarios = await Usuarios.countDocuments({});
        if (countUsuarios > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const hash = await bcrypt.hashSync(contrasena, 10);
        if (!hash) {
            res.status(200).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
            return;
        }
        const empresa = await Empresas.findOne({ esRoot: true }, 'pisos') as IEmpresa;
        if (!empresa?._id) {
            res.status(200).json({ estado: false, mensaje: "La empresa maestra no ha sido definida." });
            return;
        }
        const rol = [1, 2];
        const nuevoUsuario = new Usuarios({
            contrasena: hash,
            img_usuario: img_usuario ? await resizeImage(img_usuario) : "",
            nombre,
            apellido_pat,
            apellido_mat,
            correo,
            movil,
            telefono,
            extension,
            rol,
            id_empresa: empresa._id,
            id_piso,
            accesos,
            esRoot: true,
            creado_por: null,
            fecha_creacion: Date.now(),
        });
        const mensajes = await validarModelo(nuevoUsuario);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: "Revisa que los datos que estás ingresando sean correctos.",
                mensajes,
            });
            return;
        }
           if (img_usuario) {
            await faceDetector.guardarDescriptorUsuario({ id_usu_modif: null, id_usuario: nuevoUsuario._id, img_usuario: nuevoUsuario.img_usuario });
        }
        await nuevoUsuario
            .save()
            .then(async (reg_saved) => {
                const QR = await QRCode.toDataURL(String(reg_saved.id_general), {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width: 400,
                    margin: 2
                });
                let roles = await Roles.find({ rol: { $in: rol }, activo: true }, 'nombre')
                const rolesString = roles.map((item) => item.nombre).join(' - ');
                const resultEnvioUsuario = await enviarCorreoUsuario(correo, contrasena, rolesString, QR);
                res.status(200).json({ estado: true, datos: { correoUsuario: resultEnvioUsuario } });
            })
            .catch(async (error) => {
                log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
            });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crearConfiguracion(req: Request, res: Response): Promise<void> {
    try {
        const countConfig = await Configuracion.countDocuments({});
        if (countConfig > 0) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes usar está ruta." });
            return;
        }
        const registro = new Configuracion({ ...req.body });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: "Revisa que los datos que estás ingresando sean correctos.",
                mensajes,
            });
            return;
        }
        await registro.save();
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerGenerales(req: Request, res: Response): Promise<void> {
    try {
        const empresa = await Empresas.findOne({ esRoot: true });
        if (!empresa) {
            res.status(200).json({ estado: false, mensaje: "No se ha establecido la empresa maestra." });
            return;
        }
        const config = await Configuracion.findOne({ activo: true }, "appNombre palette");
        if (!config) {
            res.status(200).json({ estado: false, mensaje: "No se ha establecido la configuración general." });
            return;
        }
        res.status(200).json({ estado: true, datos: { img_empresa: empresa.img_empresa, appNombre: config?.appNombre, palette: config?.palette } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}