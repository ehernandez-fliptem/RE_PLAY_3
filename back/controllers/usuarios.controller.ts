import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Excel, { CellFormulaValue, CellHyperlinkValue, CellValue, Column } from 'exceljs';
import fs from 'fs';
import { Types, PipelineStage } from 'mongoose';
import QRCode from 'qrcode';
import { UserRequest } from '../types/express';
import { QueryParams } from '../types/queryparams';
import Usuarios, { IUsuario } from '../models/Usuarios';
import Roles from '../models/Roles';
import Empresas, { IEmpresa } from '../models/Empresas';
import { IPiso } from '../models/Pisos';
import { IAcceso } from '../models/Accesos';
import DispositivosHv from '../models/DispositivosHv';
import Configuracion, { IConfiguracion } from '../models/Configuracion';
import Hikvision from '../classes/Hikvision';
import { generarCodigoUnico, isEmptyObject, decryptPassword, resizeImage, customAggregationForDataGrids, marcarDuplicados } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import { enviarCorreoUsuario, enviarCorreoUsuarioNuevaContrasena } from '../utils/correos';
import { fecha, log } from "../middlewares/log";

import { CONFIG } from "../config";

import FaceDetector from '../classes/FaceDetector';
import FaceDescriptors from '../models/FaceDescriptors';
const faceDetector = new FaceDetector();

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["id_general", "empresa", "nombre", "correo", "puesto", "departamento", "cubiculo", "rolesNombre", "telefono", "movil"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'empresas',
                    localField: 'id_empresa',
                    foreignField: '_id',
                    as: 'empresa',
                    pipeline: [
                        {
                            $project: { nombre: 1 }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'roles',
                    localField: 'rol',
                    foreignField: 'rol',
                    as: 'roles',
                    pipeline: [
                        {
                            $project: { nombre: 1 }
                        }
                    ]
                }
            },
            {
                $set: {
                    empresa: { $arrayElemAt: ["$empresa", -1] },
                    rolesNombre: "$roles.nombre"
                }
            },
            {
                $set: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                    empresa: '$empresa.nombre',
                    id_general: { $toString: "$id_general" },
                    bloqueado: {
                        $cond: {
                            if: { $eq: ["$token_bloqueo", ""] },
                            then: false,
                            else: true
                        }
                    },
                    img_usuario: {
                        $cond: {
                            if: { $eq: ["$img_usuario", ""] },
                            then: false,
                            else: true
                        }
                    },
                }
            },
            {
                $project: {
                    codigo: 0,
                    apellido_pat: 0,
                    apellido_mat: 0,
                    usuario: 0,
                    contrasena: 0,
                    movil: 0,
                    telefono: 0,
                    extension: 0,
                    id_empresa: 0,
                    piso: 0,
                    id_puesto: 0,
                    id_departamento: 0,
                    id_cubiculo: 0,
                    id_horario: 0,
                    token_web: 0,
                    token_app: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                    rolesNombre: 0,
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
                $sort: sortMDB ? sortMDB : { id_general: 1 }
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
        const registros = await Usuarios.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const rol = (req as UserRequest).role;
        const esAdmin = rol.includes(1);
        const esRecep = rol.includes(2);
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre", "puesto", "correo", "telefono", "movil"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        { activo: true },
                        (isMaster && (esAdmin || esRecep)) ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
                }
            },
            {
                $project: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
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
                $sort: sortMDB ? sortMDB : { id_general: 1 }
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
        const registros = await Usuarios.aggregate(aggregation)
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerTodosDirectorio(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const rol = (req as UserRequest).role;
        const esAdmin = rol.includes(1);
        const esRecep = rol.includes(2);
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre", "puesto", "correo", "telefono", "movil"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        { activo: true },
                        (isMaster && (esAdmin || esRecep)) ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
                }
            },
            {
                $project: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                    puesto: 1,
                    correo: 1,
                    telefono: 1,
                    movil: 1
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
                $sort: sortMDB ? sortMDB : { id_general: 1 }
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
        const registros = await Usuarios.aggregate(aggregation)
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerAnfitriones(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const rol = (req as UserRequest).role;
        const esAdmin = rol.includes(1);
        const esRecep = rol.includes(2);
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
        const rolesAnfitriones = [1, 2, 3, 4, 5, 6];

        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        { activo: true },
                        (isMaster && (esAdmin || esRecep)) ? { rol: { $in: rolesAnfitriones } } : { id_empresa, rol: { $in: rolesAnfitriones } },
                    ]
                }
            },
            {
                $project: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                },
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
                $sort: sortMDB ? sortMDB : { nombre: 1 }
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
        const registros = await Usuarios.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const registro = await Usuarios.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                        isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'creado_por',
                    foreignField: '_id',
                    as: 'creado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                },
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'modificado_por',
                    foreignField: '_id',
                    as: 'modificado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                },
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'empresas',
                    localField: 'id_empresa',
                    foreignField: '_id',
                    as: 'empresa',
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "pisos",
                    localField: "id_piso",
                    foreignField: "_id",
                    as: "piso",
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
                    from: "puestos",
                    localField: "id_puesto",
                    foreignField: "_id",
                    as: "puesto",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "departamentos",
                    localField: "id_departamento",
                    foreignField: "_id",
                    as: "departamento",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "cubiculos",
                    localField: "id_cubiculo",
                    foreignField: "_id",
                    as: "cubiculo",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            },
                        },
                    ],
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
                $set: {
                    empresa: { $arrayElemAt: ['$empresa', 0] },
                    piso: { $arrayElemAt: ['$piso', 0] },
                    puesto: { $arrayElemAt: ['$puesto', 0] },
                    departamento: { $arrayElemAt: ['$departamento', 0] },
                    cubiculo: { $arrayElemAt: ['$cubiculo', 0] },
                    creado_por: { $arrayElemAt: ['$creado_por', 0] },
                    modificado_por: { $arrayElemAt: ['$modificado_por', 0] },
                }
            },
            {
                $set: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                    empresa: "$empresa.nombre",
                    piso: {
                        $trim: {
                            input: { $concat: ["$piso.identificador", " - ", "$piso.nombre"] }
                        }
                    },
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                    puesto: "$puesto.nombre",
                    departamento: "$departamento.nombre",
                    cubiculo: "$cubiculo.nombre",
                }
            },
            {
                $project: {
                    rolNombres: 0,
                    contrasena: 0,
                    token_app: 0,
                    token_web: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    id_piso: 0,
                    id_puesto: 0,
                    id_departamento: 0,
                    id_cubiculo: 0,
                    id_empresa: 0,
                    id_horario: 0,
                    arco: 0,
                    usuario: 0
                }
            }
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado' });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormNuevoUsuario(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const empresas = await Empresas.aggregate([
            {
                $match: {
                    $and: [
                        isMaster ? { activo: true } : { _id: new Types.ObjectId(id_empresa), activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: "pisos",
                    localField: "pisos",
                    foreignField: "_id",
                    as: "pisos",
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
                    from: "puestos",
                    localField: "puestos",
                    foreignField: "_id",
                    as: "puestos",
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
                    from: "departamentos",
                    localField: "departamentos",
                    foreignField: "_id",
                    as: "departamentos",
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
                    from: "cubiculos",
                    localField: "cubiculos",
                    foreignField: "_id",
                    as: "cubiculos",
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
                $project: {
                    nombre: 1,
                    pisos: 1,
                    puestos: 1,
                    departamentos: 1,
                    cubiculos: 1,
                    accesos: 1,
                    activo: 1
                }
            },
            {
                $sort: {
                    nombre: 1
                }
            }
        ]);
        res.status(200).json({ estado: true, datos: { empresas } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarUsuario(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const usuario = await Usuarios.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                        isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) }
                    ]
                }
            },

            {
                $project: {
                    contrasena: 0,
                    token_app: 0,
                    token_web: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                    activo: 0,
                }
            }
        ]);
        if (!usuario[0]) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado' });
            return;
        }
        const empresas = await Empresas.aggregate([
            {
                $match: {
                    $and: [
                        isMaster ? { activo: true } : { _id: new Types.ObjectId(id_empresa), activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: "pisos",
                    localField: "pisos",
                    foreignField: "_id",
                    as: "pisos",
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
                    from: "puestos",
                    localField: "puestos",
                    foreignField: "_id",
                    as: "puestos",
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
                    from: "departamentos",
                    localField: "departamentos",
                    foreignField: "_id",
                    as: "departamentos",
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
                    from: "cubiculos",
                    localField: "cubiculos",
                    foreignField: "_id",
                    as: "cubiculos",
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
                $project: {
                    nombre: 1,
                    pisos: 1,
                    puestos: 1,
                    departamentos: 1,
                    cubiculos: 1,
                    accesos: 1,
                }
            },
            {
                $sort: {
                    nombre: 1
                }
            }
        ]);
        res.status(200).json({
            estado: true, datos: {
                usuario: usuario[0], empresas
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

const habilitarSyncUsuariosPanel = false; // desactivado: solo empleados se suben a panel

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, id_empresa, id_piso, accesos, id_puesto, id_departamento, id_cubiculo, movil, telefono, extension, correo, contrasena, rol } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const empresa = await Empresas.findById(id_empresa, 'pisos accesos esRoot activo');
        const hash = bcrypt.hashSync(contrasena, 10);
        if (!hash) {
            res.status(500).json({ estado: false, mensaje: 'Hubo un error al generar la contraseña.' });
            return;
        }

        const nuevoUsuario = new Usuarios({
            contrasena: hash,
            img_usuario: await resizeImage(img_usuario),
            nombre,
            apellido_pat,
            apellido_mat,
            id_empresa,
            id_piso,
            accesos,
            id_puesto,
            id_departamento,
            id_cubiculo,
            movil,
            telefono,
            extension,
            correo,
            rol,
            esRoot: empresa?.esRoot,
            creado_por: id_usuario
        });
        const mensajes = await validarModelo(nuevoUsuario);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        if (img_usuario) {
            await faceDetector.guardarDescriptorUsuario({ id_usu_modif: id_usuario, id_usuario: nuevoUsuario._id, img_usuario: nuevoUsuario.img_usuario });
        } else {
            await faceDetector.deshabilitarDescriptor({ id_usu_modif: id_usuario, id_usuario: nuevoUsuario._id });
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
                const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
                if (habilitarIntegracionHv && habilitarSyncUsuariosPanel) {
                    const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: accesos } });
                    for await (let panel of paneles) {
                        const { direccion_ip, usuario, contrasena } = panel;
                        const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                        const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                        if (nuevoUsuario.img_usuario) await HVPANEL.getTokenValue();
                        await HVPANEL.saverUser(reg_saved);
                    }
                }
                {
                    res.status(200).json({ estado: true, datos: { usuario: true, correoUsuario: resultEnvioUsuario } });
                    return;
                }
            })
            .catch(async (error) => {
                log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
            });
    } catch (error: any) {
        console.log(error)
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, id_empresa, id_piso, accesos, id_puesto, id_departamento, id_cubiculo, movil, telefono, extension, correo, contrasena, rol } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const empresa = await Empresas.findById(id_empresa, 'esRoot');

        const esUsuarioMaestro = await Usuarios.find({ _id: req.params.id, esRoot: true, id_general: 1 }, '_id').limit(1);
        let updateData = {
            img_usuario: await resizeImage(img_usuario),
            nombre,
            apellido_pat,
            apellido_mat,
            movil,
            telefono,
            extension,
            accesos,
            id_puesto,
            id_departamento,
            id_cubiculo,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario
        }
        if (!esUsuarioMaestro[0]) {
            Object.assign(updateData, {
                id_empresa,
                id_piso,

                correo,
                contrasena,
                rol,
                esRoot: empresa?.esRoot,
            })
        }
        if (contrasena) {
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: 'Hubo un error al generar la contraseña.' });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }
        const registro = await Usuarios.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
                    return;
                }
                else {
                    res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
                    return;
                }
            });

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado' });
            return;
        }
        if (img_usuario) {
            await faceDetector.guardarDescriptorUsuario({ id_usu_modif: id_usuario, id_usuario: registro._id, img_usuario: registro.img_usuario });
        } else {
            await faceDetector.deshabilitarDescriptor({ id_usu_modif: id_usuario, id_usuario: registro._id });
        }
        let correoEnviado = contrasena ? await enviarCorreoUsuarioNuevaContrasena(correo, contrasena) : false;
        const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
        if (habilitarIntegracionHv && habilitarSyncUsuariosPanel) {
            const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: accesos } });
            for await (let panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                if (registro.img_usuario) await HVPANEL.getTokenValue();
                await HVPANEL.saverUser(registro);
            }
        }
        res.status(200).json({ estado: true, datos: { correoEnviado } });
        return;
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const { activo } = req.body;
        const validar_registro = await Usuarios.findOne({ _id: req.params.id, id_general: 1 });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'No puede eliminar al usuario maestro.' });
            return;
        }
        const registro = await Usuarios.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        await FaceDescriptors.updateOne({ id_usuario: req.params.id }, { $set: { activo: !activo } });
        const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
        if (habilitarIntegracionHv && habilitarSyncUsuariosPanel) {
            const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registro.accesos } });
            for await (let panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                if (activo) {
                    await HVPANEL.deleteUser(registro);
                }
                else {
                    await HVPANEL.saverUser(registro);
                }
            }
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function anonimizar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const validar_registro = await Usuarios.findById(req.params.id, 'correo activo');

        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        if (validar_registro.activo) {
            res.status(200).json({ estado: false, mensaje: 'El usuario se encuentra activo.' });
            return;
        }

        const { correo } = validar_registro;
        const hash = generarCodigoUnico(10);
        const correo_arco = `${hash}@${correo.split('@')[1]}`;

        await Usuarios.findByIdAndUpdate(req.params.id, { $set: { img_usuario: '', apellido_pat: "", apellido_mat: "", correo: correo_arco, telefono: "", movil: "", extension: "", modificado_por: id_usuario, fecha_modificacion: Date.now(), arco: true } })
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function desbloquear(req: Request, res: Response): Promise<void> {
    try {
        const validar_registro = await Usuarios.findByIdAndUpdate(req.params.id, { $set: { token_bloqueo: '', intentos: 5 } });
        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function obtenerQR(req: Request, res: Response): Promise<void> {
    try {
        if (!req.params.id) {
            res.status(200).json({ estado: false, mensaje: 'Faltan datos.' });
            return;
        }
        const usuario = await Usuarios.findById(req.params.id, 'id_general');
        if (!usuario) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        QRCode.toDataURL(String(usuario.id_general), {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2
        })
            .then(url => {
                res.status(200).json({ estado: true, datos: url });
            })
            .catch(error => {
                log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                res.status(500).send();
            });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function cargarProgramacionUsuarios(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { registros: datos, envioCorreos } = req.body;

        let detectoErrores = false;
        const registros: any[] = [];
        for await (const registro of datos) {
            let errorPass = false;
            const { contrasena } = registro;
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                errorPass = true;
                return;
            }
            const nuevoUsuario = new Usuarios({ ...registro });
            const mensajes = await validarModelo(nuevoUsuario);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...registro, errores: { contrasena: errorPass ? 'Hubo un error al generar la contraseña.' : '', ...mensajes } });
                continue;
            }
            registros.push({ ...registro, contrasena_hashed: hash });
        }
        const arrDuplicados = marcarDuplicados(registros);
        detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: registros });
            return;
        }

        let correosEnviados = 0;
        let usuariosCreados = 0;
        let registrosGuardados = [];
        for await (const registro of registros) {
            let resultCorreoUsuario = false;
            const { id_empresa, contrasena_hashed } = registro;
            const { esRoot } = await Empresas.findById(id_empresa, 'esRoot') as IEmpresa;

            const nuevoUsuario = new Usuarios({ ...registro, contrasena: contrasena_hashed, esRoot: !!esRoot, creado_por: id_usuario });
            await nuevoUsuario.save();
            if (envioCorreos) {
                const { correo, contrasena, rol } = registro;
                const { id_general } = await Usuarios.findById(nuevoUsuario._id, 'id_general') as IUsuario;
                const QR = await QRCode.toDataURL(String(id_general), {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width: 400,
                    margin: 2
                });
                let roles = await Roles.find({ rol: { $in: rol }, activo: true }, 'nombre');
                const rolesString = roles.map((item) => item.nombre).join(' - ');
                resultCorreoUsuario = await enviarCorreoUsuario(correo, contrasena, rolesString, QR);
                if (registrosGuardados) correosEnviados++;
            }
            usuariosCreados++;
            registrosGuardados.push({ ...registro, envioHabilitado: envioCorreos, correoEnviado: resultCorreoUsuario });
        }
        res.status(200).send({ estado: true, datos: { registros: registrosGuardados, usuarios: usuariosCreados, correos: correosEnviados } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const KEYS = {
    'Nombre*': 'nombre',
    'Apellido Paterno*': 'apellido_pat',
    'Apellido Materno': 'apellido_mat',
    'RFC Empresa*': 'rfc',
    'Empresa*': 'empresa',
    'Piso*': 'id_piso',
    'Accesos*': 'accesos',
    'Correo*': 'correo',
    'Contraseña*': 'contrasena',
    'Rol*': 'rol',
    'Puesto': 'puesto',
    'Departamento': 'departamento',
    'Cubículo': 'cubiculo',
    'Móvil': 'movil',
    'Teléfono': 'telefono',
    'Extensión': 'extension',
}
const isCellHyperlinkValue = (value: CellHyperlinkValue): value is CellHyperlinkValue => !!value?.hyperlink;
const isCellFormulaValue = (value: CellFormulaValue): value is CellFormulaValue => !!value?.formula;

const HEADERS = [
    'Nombre*',
    'Apellido Paterno*',
    'Apellido Materno',
    'RFC Empresa*',
    'Empresa*',
    'Piso*',
    'Accesos*',
    'Correo*',
    'Contraseña*',
    'Rol*',
    'Puesto',
    'Departamento',
    'Cubículo',
    'Móvil',
    'Teléfono',
    'Extensión',
];

export async function cargarFormato(req: Request, res: Response): Promise<void> {
    try {
        const workbook = new Excel.Workbook();
        if (!req.files || !req.files.document) {
            res.status(400).send({ estado: false, mensaje: 'No se ha proporcionado un archivo válido.' });
            return;
        }
        const file = req.files.document;
        const datos: any[] = [];
        const rawData = Array.isArray(file) ? file[0].data : file.data;
        const fileData = Buffer.from(rawData as unknown as Uint8Array) as unknown as Buffer;
        let isValidFile = false;
        await workbook.xlsx
            .load(fileData as any)
            .then(workbook => {
                const worksheet = workbook.getWorksheet(1);
                if (worksheet) {
                    const firstRow = worksheet.getRow(1);
                    const keys = Array.isArray(firstRow.values) ? firstRow.values.map((item) => String(item)) : []
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber == 1) {
                            isValidFile = keys.every((item) => HEADERS.includes(item));
                            return;
                        };
                        const valores = Array.isArray(row.values) ? row.values.map((item) => item) : [];
                        if (valores.length < 7) return;
                        let obj: { [key: string]: string | CellValue } = {};
                        for (let i = 0; i < keys.length; i++) {
                            obj[keys[i]] = valores[i];
                        }

                        const data = Object.entries(obj).reduce((op: { [key: string]: unknown }, [key, value]: [key: string, value: CellValue]) => {
                            switch (key) {
                                case "Correo*":
                                    op["correo"] = isCellHyperlinkValue(value as CellHyperlinkValue) ? (value as CellHyperlinkValue).text : String(value).trim();
                                    break;
                                case "Rol*":
                                    op["rol"] = value ? String(value).split(",").map((item) => Number(item.trim())) : [];
                                    break;
                                case "Accesos*":
                                    op["accesos"] = value ? String(value).split(",").map((item) => item.trim()) : [];
                                    break;
                                case "Empresa*":
                                    op["empresa"] = isCellFormulaValue(value as CellFormulaValue) ? (value as CellFormulaValue).result : String(value).trim();
                                    break;
                                default:
                                    const opKey = KEYS[key as keyof typeof KEYS];
                                    if (typeof value === "string")
                                        op[opKey] = String(value).trim();
                                    if (typeof value === "number")
                                        op[opKey] = String(value);
                                    break;
                            }
                            return op;
                        }, {});
                        if (!data.nombre && !data.rfc && !data.id_piso && !data.accesos && !data.correo && !data.contrasena && !data.rol) return;
                        datos.push(data)
                    });
                }
            })
            .catch((error) => {
                throw error;
            })
        if (!isValidFile) {
            res.status(400).send({ estado: false, mensaje: 'El archivo no corresponde con alguno proporcionado por el sistema.' });
            return;
        }
        if (datos.length === 0) {
            res.status(400).send({ estado: false, mensaje: 'El archivo está vacío.' });
            return;
        }
        let detectoErrores = false;

        // Obtener el ID de la empresa.
        const formatDatos = await Promise.all(datos.map(async (item) => {
            const empresa = await Empresas.aggregate([
                {
                    $match: { rfc: item.rfc }
                },
                {
                    $lookup: {
                        from: "pisos",
                        localField: "pisos",
                        foreignField: "_id",
                        as: "pisos",
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
                    $set: {
                        pisos: {
                            $filter: {
                                input: "$pisos",
                                as: "piso",
                                cond: { $eq: ["$$piso.identificador", item?.id_piso] }
                            }
                        },
                        accesos: {
                            $filter: {
                                input: "$accesos",
                                as: "acceso",
                                cond: { $in: ["$$acceso.identificador", item?.accesos] }
                            }
                        }
                    }
                },
                {
                    $set: {
                        piso: { $arrayElemAt: ["$pisos", -1] },
                    }
                },
                {
                    $set: {
                        id_piso: "$piso._id",
                        piso: "$piso.identificador",
                    }
                },
                {
                    $project: {
                        id_piso: 1,
                        piso: 1,
                        accesos: 1,
                    }
                },
                {
                    $limit: 1
                }
            ]);
            const errores = {};
            if (!empresa[0]) Object.assign(errores, { empresa: 'La empresa no existe.' });
            if (!empresa[0]?.id_piso) Object.assign(errores, { piso: 'El piso no pertenece a la empresa.' });
            const formatAccesos = item.accesos.filter((item: string) => !empresa[0]?.accesos.some((sub: IAcceso) => sub.identificador === item));
            if (empresa[0]?.accesos.length != item.accesos.length) Object.assign(errores, { acceso: `Verifica que los accesos (${formatAccesos.join(" / ")}) pertenezcan a la empresa.` });
            if (Object.values(errores).length > 0) {
                detectoErrores = true;
            }
            if (detectoErrores)
                return { ...item, _id: new Types.ObjectId(), id_empresa: empresa[0]?._id, id_piso: empresa[0]?.id_piso, piso: empresa[0]?.piso, accesos: empresa[0]?.accesos, errores }
            else
                return { ...item, _id: new Types.ObjectId(), id_empresa: empresa[0]?._id, id_piso: empresa[0]?.id_piso, piso: empresa[0]?.piso, accesos: empresa[0]?.accesos }
        }));
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: formatDatos });
            return;
        }
        detectoErrores = false;
        // Validar registros.
        const registros: any[] = [];
        for await (let usuario of formatDatos) {
            const nuevoUsuario = new Usuarios({ ...usuario });
            const mensajes = await validarModelo(nuevoUsuario);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...usuario, errores: mensajes });
                continue;
            }
            registros.push({ ...usuario });
        }
        const arrDuplicados = marcarDuplicados(registros);
        detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: registros });
            return;
        }
        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` })
    }
};

export async function descargarFormato(req: Request, res: Response): Promise<void> {
    fs.unlink('./temp/formatoUsuarios.xlsx', function (err) {
        if (err) {
            crearExcel(req, res);
        } else {
            crearExcel(req, res);
        }
    })
};

export async function crearExcel(req: Request, res: Response): Promise<void> {
    const id_usuario = (req as UserRequest).userId;
    const isMaster = (req as UserRequest).isMaster;
    const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario
    const options = {
        root: './'
    };
    try {
        fs.access('./temp/formatoUsuarios.xlsx', async (error: any) => {
            if (error) {
                const workbook = new Excel.Workbook();
                // Hoja 1 - General 
                const worksheet = workbook.addWorksheet('General');
                const Columns = [] as Column[];
                const headersValues = HEADERS;
                headersValues.map(header => {
                    if (header === 'Rol*') {
                        Columns.push({ header: header, key: header, width: 25 } as Column)
                    }
                    else {
                        Columns.push({ header: header, key: header, width: 40 } as Column)
                    }
                });
                worksheet.columns = Columns;

                // Hoja 2 - Empresas
                const worksheet_2 = workbook.addWorksheet('Empresas');
                const Columns_2 = [] as Column[];
                const headersValues_2 = ['RFC', 'Nombre', 'Pisos disponibles', 'Accesos disponibles'];
                headersValues_2.map(header => {
                    Columns_2.push({ header: header, key: header, width: 40 } as Column);
                });
                worksheet_2.columns = Columns_2;

                // Hoja 3 - Rol
                const worksheet_3 = workbook.addWorksheet('Roles');
                const Columns_3 = [] as Column[];
                const headersValues_3 = ['ID', 'Rol'];
                headersValues_3.map(header => {
                    Columns_3.push({ header: header, key: header, width: 40 } as Column);
                });
                worksheet_3.columns = Columns_3;

                await worksheet.protect(CONFIG.SECRET_EXCELJS, {});
                await workbook
                    .xlsx
                    .writeFile('./temp/formatoUsuarios.xlsx')
                    .then(async () => {
                        añadir({ isMaster, id_empresa }).then(async () => {
                            await res.sendFile('./temp/formatoUsuarios.xlsx', options);
                        });
                    })
                    .catch((error: any) => {
                        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
                    });

            } else {
                log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const añadir = async ({ isMaster, id_empresa }: { isMaster: boolean; id_empresa: Types.ObjectId; }) => {
    const nameFileExcel = './temp/formatoUsuarios.xlsx'
    const workbook = new Excel.Workbook();
    const empresas = await Empresas.aggregate([
        {
            $match: {
                $and: [
                    isMaster ? { activo: true } : { _id: id_empresa, activo: true }
                ]
            }
        },
        {
            $lookup: {
                from: "pisos",
                localField: "pisos",
                foreignField: "_id",
                as: "pisos",
                pipeline: [
                    {
                        $project: {
                            identificador: 1
                        },
                    },
                ],
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
                            identificador: 1
                        },
                    },
                ],
            },
        },
        {
            $project: {
                rfc: 1,
                nombre: 1,
                pisos: 1,
                accesos: 1
            }
        }
    ]);
    const roles = await Roles.find({ activo: true }, 'rol nombre');
    const colorRequired = "FFC000";
    const colorNotRequired = "92D050";
    const rowLimit = 50;
    // Hoja 1 - General
    await workbook.xlsx.readFile(nameFileExcel)
        .then(() => {
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) throw new Error('Hubo un error al leer la primer hoja de Excel');

            const headers = worksheet.getRow(1);
            const STR = [
                { letter: "A", required: true },
                { letter: "B", required: true },
                { letter: "C", required: true },
                { letter: "D", required: true },
                { letter: "E", required: true },
                { letter: "F", required: true },
                { letter: "G", required: true },
                { letter: "H", required: true },
                { letter: "I", required: true },
                { letter: "J", required: true },
                { letter: "K", required: false },
                { letter: "L", required: false },
                { letter: "M", required: false },
                { letter: "N", required: false },
                { letter: "O", required: false },
                { letter: "P", required: false },
            ];

            STR.forEach((item) => {
                const CLM = worksheet.getColumn(item.letter);
                CLM.protection = { locked: false };
                CLM.alignment = { vertical: 'middle', horizontal: 'center' };
                headers.getCell(item.letter).protection = { locked: true };
                headers.getCell(item.letter).fill = {
                    type: 'pattern',
                    pattern: 'darkTrellis',
                    fgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    },
                    bgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    }
                };
            });
            for (let i = 2; i < rowLimit; i++) {
                const getRowInsert = worksheet.getRow(i)
                getRowInsert.getCell("E").value = { formula: `VLOOKUP(D${i},'Empresas'!A2:B${empresas.length + 1},2,${false})` };
                getRowInsert.getCell("N").dataValidation = {
                    type: 'decimal',
                    operator: 'between',
                    allowBlank: true,
                    showErrorMessage: true,
                    formulae: [0, 999999999999999],
                    errorTitle: 'Error',
                    error: 'El formato no es válido.'
                }
                getRowInsert.getCell("O").dataValidation = {
                    type: 'decimal',
                    operator: 'between',
                    allowBlank: true,
                    showErrorMessage: true,
                    formulae: [0, 999999999999999],
                    errorTitle: 'Error',
                    error: 'El formato no es válido.'
                }
                getRowInsert.getCell("P").dataValidation = {
                    type: 'decimal',
                    operator: 'between',
                    allowBlank: true,
                    showErrorMessage: true,
                    formulae: [0, 999999999999999],
                    errorTitle: 'Error',
                    error: 'El formato no es válido.'
                }
            }

            return workbook.xlsx.writeFile(nameFileExcel);
        });
    // Hoja 2 - Empresas
    await workbook.xlsx.readFile(nameFileExcel)
        .then(() => {
            const worksheet = workbook.getWorksheet(2);
            if (!worksheet) throw new Error('Hubo un error al leer la primer hoja de Excel');

            const headers = worksheet.getRow(1);
            const columns: Column[] = [];
            const STR = [
                { letter: "A", required: true },
                { letter: "B", required: true },
                { letter: "C", required: true },
                { letter: "D", required: true },
            ];

            STR.forEach((item) => {
                const CLM = worksheet.getColumn(item.letter);
                CLM.protection = { locked: false };
                CLM.alignment = { vertical: 'middle', horizontal: 'center' };
                headers.getCell(item.letter).protection = { locked: true };
                headers.getCell(item.letter).fill = {
                    type: 'pattern',
                    pattern: 'darkTrellis',
                    fgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    },
                    bgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    }
                };
                columns.push(CLM)
            });
            empresas.forEach((item, i) => {
                const getRowInsert = worksheet.getRow(i + 2)
                getRowInsert.getCell("A").value = item.rfc;
                getRowInsert.getCell("A").protection = { locked: true };
                getRowInsert.getCell("B").value = item.nombre;
                getRowInsert.getCell("B").protection = { locked: true };
                getRowInsert.getCell("C").value = item.pisos.map((item: IPiso) => item.identificador).join(", ");
                getRowInsert.getCell("C").protection = { locked: true };
                getRowInsert.getCell("D").value = item.accesos.map((item: IAcceso) => item.identificador).join(", ");
                getRowInsert.getCell("D").protection = { locked: true };
            })

            return workbook.xlsx.writeFile(nameFileExcel);
        });
    // Hoja 3 - Rol
    await workbook.xlsx.readFile(nameFileExcel)
        .then(() => {
            const worksheet = workbook.getWorksheet(3);
            if (!worksheet) throw new Error('Hubo un error al leer la primer hoja de Excel');

            const headers = worksheet.getRow(1);
            const columns: Column[] = [];
            const STR = [
                { letter: "A", required: true },
                { letter: "B", required: true },
            ];

            STR.forEach((item) => {
                const CLM = worksheet.getColumn(item.letter);
                CLM.protection = { locked: false };
                CLM.alignment = { vertical: 'middle', horizontal: 'center' };
                headers.getCell(item.letter).protection = { locked: true };
                headers.getCell(item.letter).fill = {
                    type: 'pattern',
                    pattern: 'darkTrellis',
                    fgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    },
                    bgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    }
                };
                columns.push(CLM)
            });
            roles.forEach((item, i) => {
                const getRowInsert = worksheet.getRow(i + 2)
                getRowInsert.getCell("A").value = item.rol;
                getRowInsert.getCell("A").protection = { locked: true };
                getRowInsert.getCell("B").value = item.nombre;
                getRowInsert.getCell("B").protection = { locked: true };
            })

            return workbook.xlsx.writeFile(nameFileExcel);
        });
}
