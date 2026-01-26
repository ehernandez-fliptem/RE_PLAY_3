import { Request, Response } from "express";
import QRCode from "qrcode";
import { PipelineStage, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from "jsonwebtoken";
import dayjs, { ManipulateType } from "dayjs";
import io from "socket.io-client";
import { QueryParams } from "../types/queryparams";
import { UserRequest } from '../types/express';
import Registros, { IRegistro } from "../models/Registros";
import Usuarios, { IUsuario } from "../models/Usuarios";
import DispositivosHv from "../models/DispositivosHv";
import Visitantes, { IVisitante } from "../models/Visitantes";
import Configuracion, { IConfiguracion } from "../models/Configuracion";
import Hikvision from "../classes/Hikvision";
import Pases from "../models/Pases";
import Accesos from "../models/Accesos";
import Tokens from "../models/Tokens";
import Roles from "../models/Roles";
import TiposDocumentos from "../models/TiposDocumentos";
import {
    isEmptyObject,
    cambiarEventoRegistro,
    decryptPassword,
    customAggregationForDataGrids,
    guardarEventoNoValido,
    obtenerUltimoEvento,
    resizeImage,
    consultarDocumentacion,
    consultarDocumentacionEmpresa,
    generarCodigoUnico,
} from "../utils/utils";
import { validarModelo } from "../validators/validadores";
import {
    enviarCorreoCitaAnfitrion,
    enviarCorreoCitaVisitante,
    enviarCorreoCancelacionCitaVisitante,
    enviarCorreoCancelacionCitaAnfitrion,
    enviarCorreoModificacionCitaVisitante,
    enviarCorreoModificacionCitaAnfitrion,
    enviarCorreoUsuario,
    enviarCorreoNuevaLigaCita,
} from "../utils/correos";
import { fecha, log } from "../middlewares/log";
import { socket } from '../utils/socketClient';
import { CONFIG } from "../config";

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const id_acceso = (req as UserRequest).accessId;
        const rol = (req as UserRequest).role;
        const esAdmin = rol.includes(1);
        const esRecep = rol.includes(2);
        const esVisit = rol.includes(10);

        const { filter, pagination, sort, date, qr } = req.query as { filter: string; pagination: string; sort: string; date: string; qr: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        if (esVisit) {
            querySort?.unshift({ field: "activo", sort: "desc" })
        }
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];
        const queryDate = date as QueryParams["date"];
        const queryQr = qr as QueryParams["qr"];
        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["tipo_registro", "nombre", "anfitrion", "fecha_entrada", "estatus", "fecha_modificacion", "acceso"]
        );
        const fecha_busqueda = dayjs(queryDate);
        if (!dayjs.isDayjs(fecha_busqueda)) {
            res.status(200).json({ estado: false, mensaje: 'Revisa que la fecha de búsqueda sea válida.' })
            return;
        }
        const entrada = fecha_busqueda.startOf("day").toDate();
        const salida = fecha_busqueda.endOf("day").toDate();
        let matchAggre = {};
        if (esVisit) {
            const { correo } = await Visitantes.findById(id_usuario, 'correo') as IVisitante;
            matchAggre = {
                $and: [
                    queryQr ? { codigo: queryQr } : {},
                    date ? { fecha_entrada: { $gte: entrada, $lte: salida } } : {},
                    { correo: correo }
                ],
            }
        }
        if (!esVisit) {
            const usuario = await Usuarios.findById(id_usuario, 'id_empresa');
            const usuariosValidos = (await Usuarios.find({ id_empresa: usuario?.id_empresa }, '_id').lean()).map((item) => new Types.ObjectId(item._id)).filter((item) => !!item);
            matchAggre = {
                $and: [
                    queryQr ? { codigo: queryQr } : { fecha_entrada: { $gte: entrada, $lte: salida } },
                    (!esAdmin && !esRecep) ? { id_anfitrion: new Types.ObjectId(id_usuario) } : {},
                    !isMaster ? { id_anfitrion: { $in: usuariosValidos } } : {},
                    // (esRecep) ? { "accesos.id_acceso": { $in: [new Types.ObjectId(id_acceso)] } } : {}
                ],
            }
        }

        const aggregation: PipelineStage[] = [
            { $match: matchAggre },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_anfitrion",
                    foreignField: "_id",
                    as: "anfitrion",
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "eventos",
                    localField: "estatus",
                    foreignField: "_id",
                    as: "eventos",
                    pipeline: [
                        {
                            $lookup: {
                                from: 'accesos',
                                localField: 'id_acceso',
                                foreignField: '_id',
                                as: 'acceso',
                                pipeline: [{
                                    $project: {
                                        nombre: {
                                            $concat: [
                                                '$identificador',
                                                ' - ',
                                                '$nombre'
                                            ],
                                        },
                                    }
                                }],
                            },
                        },
                        {
                            $set: {
                                acceso: { $arrayElemAt: ["$acceso", -1] },
                            },
                        },
                        {
                            $set: {
                                acceso: "$acceso.nombre"
                            },
                        },
                        { $project: { tipo_check: 1, id_acceso: 1, acceso: 1 } },
                    ],
                },
            },
            {
                $lookup: {
                    from: "documentos",
                    localField: "documentos",
                    foreignField: "_id",
                    as: "documentos",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                tipo: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    permitir_acceso: {
                        $cond: {
                            if: { $gt: [{ $size: "$accesos" }, 0] },
                            then: {
                                $and: [
                                    esVisit ? false :
                                        {
                                            $in: [
                                                new Types.ObjectId(id_acceso),
                                                {
                                                    $map: {
                                                        input: "$accesos",
                                                        as: "a",
                                                        in: "$$a.id_acceso"
                                                    }
                                                }
                                            ]
                                        },
                                ]
                            },
                            else: false
                        }
                    },
                    se_puede_finalizar: {
                        $cond: {
                            if: { $gt: [{ $size: "$accesos" }, 0] },
                            then: {
                                $reduce: {
                                    input: "$accesos",
                                    initialValue: true,
                                    in: {
                                        $and: [
                                            "$$value",
                                            {
                                                $let: {
                                                    vars: {
                                                        eventosAcceso: {
                                                            $filter: {
                                                                input: "$eventos",
                                                                as: "evento",
                                                                cond: {
                                                                    $eq: [
                                                                        "$$evento.id_acceso",
                                                                        "$$this.id_acceso"
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        entradas: {
                                                            $size: {
                                                                $filter: {
                                                                    input: "$eventos",
                                                                    as: "evento",
                                                                    cond: {
                                                                        $and: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.id_acceso",
                                                                                    "$$this.id_acceso"
                                                                                ]
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.tipo_check",
                                                                                    5
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        salidas: {
                                                            $size: {
                                                                $filter: {
                                                                    input: "$eventos",
                                                                    as: "evento",
                                                                    cond: {
                                                                        $and: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.id_acceso",
                                                                                    "$$this.id_acceso"
                                                                                ]
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.tipo_check",
                                                                                    6
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    },
                                                    in: {
                                                        $and: [
                                                            { $gt: ["$$entradas", 0] }, // Debe haber al menos una entrada
                                                            { $gt: ["$$salidas", 0] }, // Debe haber al menos una salida
                                                            // {
                                                            //     $lte: [
                                                            //         "$$entradas",
                                                            //         "$$salidas"
                                                            //     ]
                                                            // } // Entradas == Salidas
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            },
                            else: false,
                        }
                    }
                }
            },
            {
                $set: {
                    anfitrion: { $arrayElemAt: ["$anfitrion", -1] },
                    eventos: { $arrayElemAt: ["$eventos", -1] },
                },
            },
            {
                $set: {
                    anfitrion: "$anfitrion.nombre",
                    estatus: "$eventos.tipo_check",
                    acceso: "$eventos.acceso",
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    },
                },
            },
            {
                $project: {
                    tipo_registro: 1,
                    nombre: 1,
                    correo: 1,
                    anfitrion: 1,
                    fecha_entrada: 1,
                    fecha_salida: 1,
                    estatus: 1,
                    accesos: 1,
                    acceso: 1,
                    activo: 1,
                    permitir_acceso: 1,
                    se_puede_finalizar: 1,
                    fecha_modificacion: 1,
                    documentos: 1,
                    id_anfitrion: 1
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
                $sort: sortMDB ? sortMDB : { fecha_modificacion: -1 }
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
        const registros = await Registros.aggregate(aggregation);
        const paginatedResults = [];
        let resultados = registros[0];
        for await (const item of resultados.paginatedResults) {
            const { documentos: docs, id_anfitrion } = item;
            const docsEmpresa = await consultarDocumentacionEmpresa(id_anfitrion);
            const docsFaltantesNum = docsEmpresa.filter((doc_emp) => !docs.some((doc: { tipo: number }) => doc.tipo === doc_emp));
            const docsFaltantes: string[] = [];
            for await (const doc of docsFaltantesNum) {
                const doc_name = await TiposDocumentos.findOne({ tipo: doc }, 'nombre');
                if (doc_name) {
                    docsFaltantes.push(doc_name.nombre)
                }
            }
            paginatedResults.push({ ...item, docs_faltantes: docsFaltantes });
        }
        resultados.paginatedResults = paginatedResults;
        res.status(200).json({ estado: true, datos: resultados });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUltimoRegistro(req: Request, res: Response): Promise<void> {
    try {
        const { tipo, correo } = req.query;
        const esBloqueado = (await Visitantes.find({ correo, activo: false }, '_id').lean())[0];
        if (esBloqueado) {
            res.status(200).json({ estado: 3, mensaje: 'El visitante esta bloqueado.' });
            return;
        }
        const projection: Record<string, string> = {
            "1": "nombre apellido_pat apellido_mat telefono empresa",
            "2": "nombre apellido_pat apellido_mat telefono empresa",
            "3": "img_usuario img_ide_a img_ide_b nombre apellido_pat apellido_mat"
        };
        const tipoKey = typeof tipo === "string" && projection[tipo] ? tipo : "1";
        const registro = await Visitantes
            .find({ correo }, projection[tipoKey])
            .limit(1);
        if (!registro[0]) {
            res.status(200).json({ estado: 2, mensaje: 'Sin información por autocompletar.' });
            return;
        }
        res.status(200).json({ estado: 1, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                    ]
                },
            },
            {
                $lookup: {
                    from: 'tipos_registros',
                    localField: 'tipo_registro',
                    foreignField: 'tipo',
                    as: 'tipo_registro',
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
                    from: 'eventos',
                    localField: 'estatus',
                    foreignField: '_id',
                    as: 'estatus',
                    pipeline: [
                        {
                            $match: {
                                tipo_check: { $ne: 0 },
                            },
                        },
                        {
                            $lookup: {
                                from: 'accesos',
                                localField: 'id_acceso',
                                foreignField: '_id',
                                as: 'acceso',
                                pipeline: [{
                                    $project: {
                                        nombre: {
                                            $concat: [
                                                '$identificador',
                                                ' - ',
                                                '$nombre'
                                            ],
                                        },
                                    }
                                }],
                            },
                        },
                        {
                            $lookup: {
                                from: 'tipos_eventos',
                                localField: 'tipo_check',
                                foreignField: 'tipo',
                                as: 'tipo_evento',
                                pipeline: [{ $project: { nombre: 1 } }],
                            },
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
                                                $concat: [
                                                    '$nombre',
                                                    ' ',
                                                    '$apellido_pat',
                                                    ' ',
                                                    '$apellido_mat',
                                                ],
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $set: {
                                acceso: { $arrayElemAt: ['$acceso', 0] },
                                tipo_evento: { $arrayElemAt: ['$tipo_evento', 0] },
                                creado_por: { $arrayElemAt: ['$creado_por', 0] },
                            },
                        },
                        {
                            $set: {
                                acceso: "$acceso.nombre",
                                creado_por: "$creado_por.nombre"
                            },
                        },
                        {
                            $project: {
                                img_check: { $cond: [{ $eq: ['$img_check', ''] }, 0, 1] },
                                img_perfil: { $cond: [{ $eq: ['$img_perfil', ''] }, 0, 1] },
                                tipo_check: 1,
                                fecha_creacion: 1,
                                tipo_dispositivo: 1,
                                creado_por: 1,
                                comentario: 1,
                                acceso: 1
                            },
                        },
                        { $sort: { fecha_creacion: -1 } },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'id_anfitrion',
                    foreignField: '_id',
                    as: 'anfitrion',
                    pipeline: [
                        {
                            $lookup: {
                                from: 'empresas',
                                localField: 'id_empresa',
                                foreignField: '_id',
                                as: 'empresa'
                            }
                        },
                        {
                            $set: {
                                empresa: { $arrayElemAt: ["$empresa", -1] }
                            }
                        }, {
                            $set: {
                                empresa: "$empresa.nombre"
                            }
                        },
                        {
                            $project: {
                                nombre: {
                                    $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                                },
                                correo: 1,
                                telefono: 1,
                                movil: 1,
                                empresa: 1,
                                piso: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'pases',
                    localField: 'id_pase',
                    foreignField: '_id',
                    as: 'pase',
                    pipeline: [
                        {
                            $project: {
                                codigo: 1,
                            },
                        },
                    ],
                },
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
                                    $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                                },
                            },
                        },
                    ],
                },
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
                                    $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'documentos',
                    localField: 'documentos',
                    foreignField: '_id',
                    as: 'documentos',
                    pipeline: [
                        {
                            $project: {
                                tipo: 1,
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    tipo_registro: { $arrayElemAt: ['$tipo_registro', 0] },
                    anfitrion: { $arrayElemAt: ['$anfitrion', 0] },
                    pase: { $arrayElemAt: ['$pase', 0] },
                    creado_por: { $arrayElemAt: ['$creado_por', 0] },
                    modificado_por: { $arrayElemAt: ['$modificado_por', 0] },
                },
            },
            {
                $set: {
                    tipo_registro: "$tipo_registro.nombre",
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                    pase: '$pase.codigo',
                    creado_por: '$creado_por.nombre',
                    modificado_por: '$modificado_por.nombre',
                    tipo_ide: {
                        $switch:
                        {
                            branches: [
                                { case: 1, then: "Oficial" },
                                { case: 2, then: "Licencia de Conducir" },
                                { case: 3, then: "Pasaporte" },
                                { case: 4, then: "Otro" },
                            ],
                            default: "Sin definir."
                        }
                    }
                },
            },
            {
                $project: {
                    codigo: 1,
                    estatus: 1,
                    tipo_registro: 1,
                    nombre: 1,
                    correo: 1,
                    telefono: 1,
                    img_usuario: 1,
                    tipo_ide: 1,
                    img_ide_a: 1,
                    img_ide_b: 1,
                    numero_ide: 1,
                    actividades: 1,
                    fecha_entrada: 1,
                    fecha_salida: 1,
                    comentarios: 1,
                    placas: 1,
                    desc_vehiculo: 1,
                    motivo_cancelacion: 1,
                    anfitrion: 1,
                    pase: 1,
                    documentos: 1,
                    fecha_creacion: 1,
                    creado_por: 1,
                    fecha_modificacion: 1,
                    modificado_por: 1,
                    activo: 1,
                },
            },
            {
                $limit: 1,
            },
        ]);

        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: 'Registro no encontrado.' });
            return;
        }

        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormEditarRegistro(req: Request, res: Response): Promise<void> {
    try {
        const id_acceso = (req as UserRequest).accessId;
        const registro = await Registros.aggregate([
            { $match: { _id: new Types.ObjectId(req.params.id) }, },
            {
                $lookup: {
                    from: "eventos",
                    localField: "estatus",
                    foreignField: "_id",
                    as: "eventos",
                    pipeline: [
                        { $project: { tipo_check: 1 } },
                        { $limit: 1 },
                        { $sort: { fecha_creacion: 1 } }
                    ],
                },
            },
            {
                $set: {
                    eventos: { $arrayElemAt: ["$eventos", -1] },
                },
            },
            {
                $set: {
                    estatus: "$eventos.tipo_check",
                },
            },
            {
                $project: {
                    codigo: 0,
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                }
            }

        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Registro no encontrado." });
            return;
        }
        if (registro[0].estatus !== 1 || !registro[0].activo) {
            res.status(200).json({ estado: false, mensaje: "Ya no se puede editar este registro." });
            return;
        }
        // const canAllowAccess = (registro[0].accesos as IRegistro["accesos"]).some((item) => String(item.id_acceso) === String(id_acceso));
        // if (!canAllowAccess) {
        //     res.status(200).json({ estado: false, mensaje: "No estás autorizado para dar acceso a este visitante, debe dirigirse al acceso correspondiente." });
        //     return;
        // }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevoRegistro(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const rol = (req as UserRequest).role;
        const esRecep = rol.includes(2);
        const esVisit = rol.includes(10);
        let anfitriones = [];
        if (esVisit) {
            anfitriones = await Usuarios.aggregate([
                {
                    $match: {
                        $and: [
                            { activo: true }
                        ]
                    }
                },
                {
                    $project: {
                        nombre: {
                            $trim: {
                                input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat", " ", "(", "$correo", ")"] }
                            }
                        }
                    },
                }
            ]);
        }
        else {
            const usuario = await Usuarios.findById(id_usuario, 'id_empresa');
            anfitriones = await Usuarios.aggregate([
                {
                    $match: {
                        $and: [
                            !esRecep ? { _id: new Types.ObjectId(id_usuario) } : {},
                            isMaster ? { activo: true } : { id_empresa: new Types.ObjectId(usuario?.id_empresa), activo: true }
                        ]
                    }
                },
                {
                    $project: {
                        nombre: {
                            $trim: {
                                input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat", " ", "(", "$correo", ")"] }
                            }
                        }
                    },
                }
            ]);
        }
        res.status(200).json({ estado: true, datos: { anfitriones } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerAccesosPorAnfitrion(req: Request, res: Response): Promise<void> {
    try {
        const { id_anfitrion } = req.body;
        const { id_empresa } = await Usuarios.findById(id_anfitrion, 'id_empresa') as IUsuario;
        const accesosDisponibles = await Accesos.aggregate([
            {
                $match: {
                    $and: [
                        { empresas: { $in: [new Types.ObjectId(id_empresa)] }, activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: "hikvision_dispositivos",
                    localField: "hikvision_dispositivos",
                    foreignField: "_id",
                    as: "dispositivos",
                    pipeline: [
                        {
                            $project: {
                                _id: 1
                            }
                        },
                        {
                            $limit: 1
                        }
                    ]
                }
            },
            {
                $set: {
                    dispositivos: {
                        $arrayElemAt: ["$dispositivos", 0]
                    }
                }
            },
            {
                $set: {
                    dispositivos: "$dispositivos._id"
                }
            },
            {
                $project: {
                    identificador: 1,
                    nombre: 1,
                    modos: {
                        $cond: [
                            { $ifNull: ["$dispositivos", false] },
                            [1, 2],
                            [1]
                        ]
                    },
                },
            }
        ]);
        res.status(200).json({ estado: true, datos: { accesos: accesosDisponibles } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerReportes(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, estatus, correo, tipo_registro, telefono, id_anfitrion, fecha_inicio, fecha_final } = req.body.datos;
        const entrada = dayjs(fecha_inicio).toDate();
        const salida = dayjs(fecha_final).toDate();
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
            ["tipo_registro", "correo", "nombre", "anfitrion", "empresa", "telefono", "fecha_entrada", "fecha_salida", "estatus"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $or: [
                        fecha_inicio && fecha_final
                            ? {
                                fecha_entrada: { $gte: entrada, $lte: salida },
                            }
                            : {},
                    ],
                    $and: [
                        telefono
                            ? {
                                "telefono": {
                                    $regex: telefono,
                                    $options: "i",
                                },
                            }
                            : {},
                        correo
                            ? {
                                "correo": {
                                    $regex: correo,
                                    $options: "i",
                                },
                            }
                            : {},
                        nombre
                            ? {
                                "nombre_completo": {
                                    $regex: nombre,
                                    $options: "i",
                                },
                            }
                            : {},
                        tipo_registro?.length
                            ? { tipo_registro: { $in: tipo_registro.map((item: string) => Number(item)) } }
                            : { tipo_registro: { $in: [1, 2] } },
                        id_anfitrion?.length
                            ? { id_anfitrion: { $in: id_anfitrion.map((item: string) => new Types.ObjectId(item)) } }
                            : {},
                    ],
                },
            },
            {
                $lookup: {
                    from: "eventos",
                    localField: "estatus",
                    foreignField: "_id",
                    as: "estatus",
                    pipeline: [
                        {
                            $lookup: {
                                from: "tipos_eventos",
                                localField: "tipo_check",
                                foreignField: "tipo",
                                as: "tipo_evento",
                                pipeline: [{ $project: { nombre: 1 } }],
                            },
                        },
                        {
                            $set: {
                                tipo_evento: { $arrayElemAt: ["$tipo_evento", -1] },
                            },
                        },
                        {
                            $set: {
                                estatus_nombre: "$tipo_evento.nombre",
                            },
                        },
                        { $project: { tipo_check: 1, fecha_creacion: 1 } },
                        { $sort: { fecha_creacion: -1 } },
                        { $limit: 1 }
                    ],
                },
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_anfitrion",
                    foreignField: "_id",
                    as: "anfitrion",
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "tipos_registros",
                    localField: "tipo_registro",
                    foreignField: "tipo",
                    as: "tipos_registros",
                    pipeline: [{ $project: { nombre: 1 } }],
                },
            },
            {
                $set: {
                    estatus: { $arrayElemAt: ["$estatus", -1] },
                    anfitrion: { $arrayElemAt: ["$anfitrion", -1] },
                    tipos_registros: { $arrayElemAt: ["$tipos_registros", -1] },
                },
            },
            {
                $set: {
                    estatus: "$estatus.tipo_check",
                    anfitrion: "$anfitrion.nombre",
                    nombre: {
                        $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                    },
                },
            },
            {
                $match: {
                    $and: [
                        estatus?.length ? { estatus: { $in: estatus.map((item: string) => Number(item)) } } : {},
                        { estatus: { $nin: [0, 5, 6, 7] } }
                    ],
                },
            },
            {
                $project: {
                    tipo_registro: 1,
                    correo: 1,
                    nombre: 1,
                    anfitrion: 1,
                    empresa: 1,
                    telefono: 1,
                    fecha_entrada: 1,
                    fecha_salida: 1,
                    estatus: 1,
                },
            }
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
                $sort: sortMDB ? sortMDB : { fecha_entrada: -1 }
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
        const registros = await Registros.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const id_acceso = (req as UserRequest).accessId;
        const {
            folio,
            tipo_registro,
            img_usuario,
            img_ide_a,
            img_ide_b,
            nombre,
            apellido_pat,
            apellido_mat,
            correo,
            telefono,
            empresa,
            id_pase,
            id_anfitrion: anfitrion,
            fechas,
            fecha_entrada,
            actividades,
            accesos,
            comentarios,
            placas,
            desc_vehiculo,
            se_puede_guardar,
        } = req.body;

        if (tipo_registro == 1 && dayjs(fecha_entrada).isBefore(dayjs())) {
            res.status(200).json({ estado: false, datos: { estado: 4, folio, errores: { fecha_entrada: "La fecha de entrada no debe ser menor a la fecha actual." } } })
            return;
        }

        const id_usuario = (req as UserRequest).userId;
        const rol = (req as UserRequest).role;
        const esRecep = rol.includes(2);
        const esVisit = rol.includes(10);
        const id_anfitrion = (esRecep || esVisit) ? (anfitrion ? anfitrion : null) : id_usuario;

        let visitante = await Visitantes.findOne({ correo });

        let erroresVisitante = {};
        if (!visitante) {
            const contrasena = generarCodigoUnico(20, true);
            const hash = bcrypt.hashSync(contrasena, 10);
            visitante = new Visitantes({
                img_usuario: await resizeImage(img_usuario),
                contrasena: hash,
                nombre,
                apellido_pat,
                apellido_mat,
                correo,
                telefono,
                empresa,
                creado_por: id_usuario,
            })
            erroresVisitante = await validarModelo(visitante);
            const validar_usuario = await Usuarios.findOne({ correo }, '_id');
            if (validar_usuario) {
                erroresVisitante = { usuario: "Este correo no puede usarse para un visitante." }
            }
            if (!validar_usuario && isEmptyObject(erroresVisitante)) {
                await visitante
                    .save()
                    .then(async (reg_saved) => {
                        const QR = await QRCode.toDataURL(String(reg_saved.id_visitante), {
                            errorCorrectionLevel: 'H',
                            type: 'image/png',
                            width: 400,
                            margin: 2
                        });
                        let roles = await Roles.find({ rol: { $in: [10] }, activo: true }, 'nombre');
                        const rolesString = roles.map((item) => item.nombre).join(' - ');
                        await enviarCorreoUsuario(correo, contrasena, rolesString, QR);
                    })
                    .catch(async (error) => {
                        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                    });
            }
        } else {
            if (!visitante.activo) {
                res.status(200).json({ estado: false, datos: { estado: 4, folio, errores: { visitante: "El visitante se encuentra inactivo." } } })
                return;
            }
            await Visitantes.updateOne({ _id: visitante._id }, {
                img_usuario: await resizeImage(img_usuario),
                nombre,
                apellido_pat,
                apellido_mat,
                correo,
                telefono,
                empresa,
                creado_por: id_usuario,
            })
        }
        const docsEmpresa = await consultarDocumentacionEmpresa(id_anfitrion);
        const docs = await consultarDocumentacion(visitante._id, docsEmpresa);
        const docsFaltantesNum = docsEmpresa.filter((doc_emp) => !docs.some((doc: { tipo: number }) => doc.tipo === doc_emp));
        const docsFaltantes: string[] = [];
        for await (const doc of docsFaltantesNum) {
            const doc_name = await TiposDocumentos.findOne({ tipo: doc }, 'nombre');
            if (doc_name) {
                docsFaltantes.push(doc_name.nombre)
            }
        }
        let seEnvioCorreoVisit = 0;
        let seEnvioCorreoAnfit = 0;
        const registrosCreadosWS: string[] = [];
        const { tiempoToleranciaSalida, tiempoToleranciaEntrada, habilitarIntegracionHv } = await Configuracion.findOne({}, 'tiempoToleranciaSalida tiempoToleranciaEntrada habilitarIntegracionHv') as IConfiguracion;
        const tiempoSalida = Number(tiempoToleranciaSalida.split('/')[0]);
        const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
        const tipoSalida = tiempoToleranciaSalida.split('/')[1] as ManipulateType;
        const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;

        let fechas_entrada: { fecha_entrada: string, errores?: {} }[];
        if (Array.isArray(fechas) && fechas.length > 0) {
            fechas_entrada = fechas;
        } else {
            fechas_entrada = [{ fecha_entrada }];
        }
        for await (const elem of fechas_entrada) {
            if (!isEmptyObject(erroresVisitante)) {
                elem.errores = erroresVisitante;
                continue;
            }
            const nuevoRegistro = new Registros({
                codigo: visitante.codigo,
                tipo_registro,
                img_usuario,
                img_ide_a,
                img_ide_b,
                nombre,
                apellido_pat,
                apellido_mat,
                correo,
                telefono,
                empresa,
                id_pase: id_pase ? id_pase : null,
                id_anfitrion,
                fecha_entrada: dayjs(elem.fecha_entrada).toDate(),
                actividades,
                accesos,
                comentarios,
                placas,
                desc_vehiculo,
                documentos: docs.map((item) => item._id),
                creado_por: id_usuario,
            });

            const mensajes = await validarModelo(nuevoRegistro);
            if (!isEmptyObject(mensajes)) {
                if (!se_puede_guardar) elem.errores = { ...mensajes, docs_faltantes: `Aún no se suben los siguientes documentos: ${docsFaltantes.join(" - ")}` }
                continue;
            }

            if (!!se_puede_guardar) {
                await nuevoRegistro.save();
                const registroUpdated = await cambiarEventoRegistro({
                    tipo_dispositivo: 1,
                    tipo_check: tipo_registro === 1 ? 1 : 5,
                    id_registro: nuevoRegistro._id,
                    id_usuario: id_usuario,
                    id_visitante: visitante._id,
                    id_acceso: accesos[0].id_acceso
                }) as IRegistro;
                if (id_pase) {
                    await Pases.findByIdAndUpdate(id_pase, { $set: { vigente: false } });
                }
                if (habilitarIntegracionHv) {
                    const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registroUpdated.accesos.filter((item) => item.modo == 2).map((item) => item.id_acceso) } });
                    const entrada = dayjs(fecha_entrada).subtract(tiempoEntrada, tipoEntrada);
                    const salida = dayjs().add(12, "hours").add(tiempoSalida, tipoSalida);

                    for (const panel of paneles) {
                        const { direccion_ip, usuario, contrasena } = panel;
                        const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                        const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                        if (img_usuario) await HVPANEL.getTokenValue();
                        await HVPANEL.saveRegister({ ...registroUpdated, fecha_entrada: entrada.toDate(), fecha_salida: salida.toDate(), activo: true });
                    }
                }
                registrosCreadosWS.push(nuevoRegistro._id.toString());
            }
        }

        if (fechas_entrada.some((item) => item.errores)) {
            res.status(200).json({ estado: false, datos: { estado: 4, info: { folio, fechas: fechas_entrada } } });
            return;
        }

        if (tipo_registro == 1 && registrosCreadosWS.length > 0) {
            seEnvioCorreoVisit = esVisit ? 1 : await enviarCorreoCitaVisitante(visitante.codigo, registrosCreadosWS, docsFaltantes.join(" - "));
            seEnvioCorreoAnfit = await enviarCorreoCitaAnfitrion(registrosCreadosWS);
        }

        res.status(200).json({
            estado: true,
            datos: {
                estado: (!se_puede_guardar && docsFaltantes.length > 0) ? 5 : !se_puede_guardar ? 2 : ((seEnvioCorreoAnfit > 0 && seEnvioCorreoVisit > 0) || [2, 3].includes(Number(tipo_registro))) ? 2 : 3,
                info: { folio, ...req.body, fechas: fechas_entrada.map((item) => { return { ...item, errores: docsFaltantes.length > 0 ? { documentos: `Aún no se suben los siguientes documentos: ${docsFaltantes.join(" - ")}` } : {} } }) },
                correos_enviados: {
                    anfitrion: seEnvioCorreoAnfit > 0,
                    visitante: seEnvioCorreoVisit > 0
                }
            },
            ws: {
                registros_creados: registrosCreadosWS
            }
        });
    } catch (error: any) {
        console.error(error);
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function editarCita(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;
        const id_registro = req.params.id;
        const { tipo_ide, img_usuario, img_ide_a, img_ide_b, id_pase, nombre, numero_ide, placas, desc_vehiculo } = req.body;

        const validar_registro = await Registros.findByIdAndUpdate(id_registro, { tipo_ide, img_usuario, img_ide_a, img_ide_b, nombre, numero_ide, placas, desc_vehiculo, id_tag: id_pase ? id_pase : null }, { new: true });

        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaj: 'Registro no encontrado.' });
            return;
        }

        const visitante = (await Visitantes.find({ correo: validar_registro.correo }, '_id').lean())[0];
        const registroEventoUp = await cambiarEventoRegistro({
            tipo_dispositivo: 1,
            tipo_check: 5,
            id_registro: id_registro,
            id_usuario: id_usuario,
            id_visitante: visitante._id,
            id_acceso
        }) as IRegistro;

        const { tiempoToleranciaEntrada, habilitarIntegracionHv } = await Configuracion.findOne({}, 'tiempoToleranciaEntrada habilitarIntegracionHv') as IConfiguracion;

        const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
        const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;

        const fechaEntrada = dayjs(registroEventoUp.fecha_entrada).subtract(tiempoEntrada, tipoEntrada)
        const fechaSalida = dayjs().add(12, "hours")

        if (habilitarIntegracionHv) {
            const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registroEventoUp.accesos.map((item) => item.id_acceso) } });
            for await (let panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                if (validar_registro.img_usuario) await HVPANEL.getTokenValue();
                await HVPANEL.saveRegister({
                    ...registroEventoUp,
                    fecha_entrada: fechaEntrada.toDate(),
                    fecha_salida: fechaSalida.toDate(),
                    activo: registroEventoUp.activo
                });
            }
        }

        res.status(200).json({ estado: true })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarCita(req: Request, res: Response): Promise<void> {
    try {
        const id_registro = req.params.id;
        const { nombre, apellido_pat, apellido_mat, telefono, empresa, id_anfitrion, actividades, accesos, fecha_entrada, comentarios, placas, desc_vehiculo } = req.body;
        let validar_registro = await Registros.findById(id_registro);

        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaj: 'Registro no encontrado.' });
            return;
        }

        const visitante = (await Visitantes.find({ correo: validar_registro.correo }, '_id').lean())[0];
        const docsEmpresa = await consultarDocumentacionEmpresa(id_anfitrion);
        const docs = await consultarDocumentacion(visitante?._id, docsEmpresa);
        validar_registro = await Registros.findByIdAndUpdate(id_registro, { $set: { nombre, apellido_pat, apellido_mat, telefono, empresa, id_anfitrion, actividades, accesos, fecha_entrada, comentarios, placas, desc_vehiculo, documentos: docs.map((item) => item._id) } }, { new: true });

        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaj: 'Registro no encontrado.' });
            return;
        }

        let seEnvioCorreoVisit = false;
        let seEnvioCorreoAnfit = false;
        if (validar_registro.tipo_registro == 1) {
            const QR = await QRCode.toDataURL(String(validar_registro.codigo), {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                width: 400,
                margin: 2
            });
            seEnvioCorreoVisit = await enviarCorreoModificacionCitaVisitante(2, validar_registro.id_anfitrion, validar_registro.correo, fecha_entrada, QR, validar_registro._id);
            seEnvioCorreoAnfit = await enviarCorreoModificacionCitaAnfitrion(2, validar_registro.id_anfitrion, fecha_entrada, validar_registro._id);
        }

        const { tiempoToleranciaEntrada, habilitarIntegracionHv } = await Configuracion.findOne({}, 'tiempoToleranciaEntrada habilitarIntegracionHv') as IConfiguracion;

        const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
        const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;

        const fechaEntrada = dayjs(validar_registro.fecha_entrada).subtract(tiempoEntrada, tipoEntrada)
        const fechaSalida = dayjs().add(12, "hours")

        if (habilitarIntegracionHv) {
            const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: validar_registro.accesos.map((item) => item.id_acceso) } });
            for await (let panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                if (validar_registro.img_usuario) await HVPANEL.getTokenValue();
                await HVPANEL.saveRegister({
                    ...validar_registro,
                    fecha_entrada: fechaEntrada.toDate(),
                    fecha_salida: fechaSalida.toDate(),
                    activo: validar_registro.activo
                });
            }
        }

        res.status(200).json({
            estado: true,
            datos: {
                correos_enviados: {
                    anfitrion: seEnvioCorreoAnfit,
                    visitante: seEnvioCorreoVisit
                }
            },
        })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function marcarNuevoAcceso(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;
        let comentario = "";
        const registro = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                    ]
                }
            },
            {
                $addFields: {
                    canAccess: {
                        $and: [
                            { $ne: ["$tipo_ide", 0] },
                            { $ne: ["$tipo_ide", null] },
                            { $ne: ["$tipo_ide", undefined] },
                            { $ne: ["$img_usuario", null] },
                            { $ne: ["$img_usuario", ""] },
                            { $ne: ["$img_ide_a", null] },
                            { $ne: ["$img_ide_a", ""] },
                            { $ne: ["$img_ide_b", null] },
                            { $ne: ["$img_ide_b", ""] },
                            { $ne: ["$numero_ide", null] },
                            { $ne: ["$numero_ide", ""] },
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "visitantes",
                    localField: "correo",
                    foreignField: "correo",
                    as: "visitante",
                    pipeline: [
                        {
                            $project: {
                                _id: 1
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    visitante: { $arrayElemAt: ["$visitante", -1] },
                }
            },
            {
                $set: {
                    id_visitante: "$visitante._id"
                }
            },
            {
                $project: {
                    tipo_registro: 1,
                    accesos: 1,
                    canAccess: 1,
                    activo: 1,
                    id_visitante: 1,
                }
            },
            {
                $limit: 1
            }
        ]);
        if (!registro[0]) {
            comentario = "El registro no fue encontrado.";
            await guardarEventoNoValido("", "", comentario, id_usuario, "", "", null, null, 1);
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        const { _id: id_registro, tipo_registro, accesos, canAccess, id_visitante, activo } = registro[0];
        if (!activo) {
            comentario = "El registro ya no esta disponible.";
            await guardarEventoNoValido("", "", comentario, id_usuario, "", id_registro, null, null, 1);
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        const canAllowAccess = (accesos as IRegistro["accesos"]).some((item) => String(item.id_acceso) === String(id_acceso));
        if (!canAllowAccess) {
            comentario = "No estás autorizado para dar acceso a este visitante debido a que tu empresa no tiene los accesos requeridos.";
            await guardarEventoNoValido("", "", comentario, id_usuario, "", id_registro, null, null, 1);
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        if (tipo_registro === 1 && !canAccess) {
            res.status(200).json({ estado: true, datos: { id_registro, puedeAcceder: canAccess } });
            return;
        } else {
            const { estado, datos: ulitmo_evento, mensaje } = await obtenerUltimoEvento(id_registro, [5, 6], id_acceso);
            if (!estado) {
                comentario = mensaje || "Hubo un error inesperado.";
                await guardarEventoNoValido("", "", comentario, id_usuario, "", id_registro, null, null, 1);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            const tipo_evento = ulitmo_evento === 5 ? 6 : 5;
            await cambiarEventoRegistro({
                tipo_dispositivo: 1,
                tipo_check: tipo_evento,
                id_registro: id_registro,
                id_usuario: id_usuario,
                id_visitante,
                id_acceso
            }, { _id: 1 }) as IRegistro;
            res.status(200).json({ estado: true, datos: { id_registro, puedeAcceder: canAccess } });
            return;
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
}

export async function finalizar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;
        const id_registro = req.params.id;
        const validar_registro = await Registros.findByIdAndUpdate(id_registro, { fecha_salida: Date.now() }, { new: true });

        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaj: 'Registro no encontrado.' });
            return;
        }
        const visitante = (await Visitantes.find({ correo: validar_registro.correo }, '_id').lean())[0];
        const registroUpdated = await cambiarEventoRegistro({
            tipo_dispositivo: 1,
            tipo_check: 9,
            id_registro: id_registro,
            id_usuario: id_usuario,
            id_visitante: visitante._id,
            id_acceso
        }, { codigo: 1, tipo_registro: 1, fecha_salida: 1, fecha_modificacion: 1, accesos: 1 }) as IRegistro | false
        if (!registroUpdated) {
            res.status(200).json({ estado: false, mensaje: 'Registro no encontrado.' });
            return;
        }
        const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
        if (habilitarIntegracionHv) {
            const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registroUpdated.accesos.map((item) => item.id_acceso) } });
            for await (let panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                await HVPANEL.deleteRegister(registroUpdated);
            }
        }

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function cancelar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;

        const { motivo_cancelacion, enviar_correo } = req.body;
        const id_registro = req.params.id;

        let respuestaVisit = false;
        let respuestaAnfit = false;
        const registro_activo = await Registros.findById(id_registro, 'correo activo');
        if (!registro_activo) {
            res.status(200).json({ estado: false, mensaje: 'Registro no encontrado.' });
            return;
        }
        if (!registro_activo.activo) {
            res.status(200).json({ estado: false, mensaje: 'Registro inactivo.' });
            return;
        }
        const visitante = (await Visitantes.find({ correo: registro_activo.correo }, '_id').lean())[0];
        const registro = await cambiarEventoRegistro({
            tipo_dispositivo: 1,
            tipo_check: 8,
            id_registro: id_registro,
            id_usuario: id_usuario,
            motivo_cancelacion: motivo_cancelacion,
            id_visitante: visitante._id,
            id_acceso
        }) as IRegistro | false;

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Registro no encontrado.' });
            return;
        }
        const { id_anfitrion, nombre, fecha_entrada, correo } = registro;
        if (enviar_correo) {
            if (correo) {
                respuestaVisit = await enviarCorreoCancelacionCitaVisitante(
                    correo,
                    id_anfitrion,
                    motivo_cancelacion,
                    dayjs(fecha_entrada).format("DD/MM/YYYY, HH:mm a"),
                );
            }

            respuestaAnfit = await enviarCorreoCancelacionCitaAnfitrion(
                id_anfitrion,
                correo ? correo : "No definido.",
                nombre,
                motivo_cancelacion,
                dayjs(fecha_entrada).format("DD/MM/YYYY, HH:mm a"),
            );
        }
        const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
        if (habilitarIntegracionHv) {
            const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registro.accesos.map((item) => item.id_acceso) } });
            for await (let panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                await HVPANEL.deleteRegister(registro);

            }
        }
        res.status(200).json({ estado: true, datos: { anfitrion: respuestaAnfit, visitante: respuestaVisit } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function enviarCorreoCita(req: Request, res: Response): Promise<void> {
    try {
        const { correo, fecha_entrada, id_anfitrion, accesos } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const rol = (req as UserRequest).role;
        const esRecep = rol.includes(2);

        const validar_anfitrion = await Usuarios.findById(id_anfitrion || id_usuario, 'activo');
        if (!validar_anfitrion) {
            res.status(200).json({ estado: false, mensaje: "El anfitrión no existe." })
            return;
        }
        if (!validar_anfitrion.activo) {
            res.status(200).json({ estado: false, mensaje: "El anfitrión ya no se encuentra disponible." })
            return;
        }
        if (dayjs(fecha_entrada).isBefore(dayjs())) {
            res.status(400).json({ estado: false, mensajes: { fecha_entrada: "La fecha de entrada no debe ser menor a la fecha actual." } })
            return;
        }

        const existeVisitante = (await Visitantes.find({ correo }).limit(1))[0];
        if (!existeVisitante) {
            res.status(200).json({ estado: false, mensaje: "El correo no pertenece a un visitante registrado." });
            return;
        }
        const expiresIn = dayjs(fecha_entrada).diff(dayjs(), 'second');
        if (expiresIn < 28800) {
            res.status(200).json({ estado: false, mensaje: "Debes crear el enlace con un mínimo de 8 horas de anticipación." })
            return;
        }
        const TOKEN = jwt.sign({ correo, fecha_entrada, id_anfitrion: esRecep ? id_anfitrion : id_usuario, accesos }, CONFIG.SECRET_EMAIL, { expiresIn } as SignOptions);
        const nuevoToken = new Tokens({ token: TOKEN, tipo: 2, creado_por: id_usuario });
        await nuevoToken.save();
        const correoEnviado = await enviarCorreoNuevaLigaCita(correo, TOKEN);
        if (!correoEnviado) {
            res.status(200).json({ estado: false, mensaje: "Hubo un problema al enviar el correo." });
            return;
        }
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function validarTokenVisitante(req: Request, res: Response): Promise<void> {
    try {
        const { token } = req.body;
        const decoded = jwt.verify(token, CONFIG.SECRET_EMAIL) as { correo: string; fecha_entrada: string; id_anfitrion: string; accesos: [] };

        if (!decoded) {
            res.status(200).json({ estado: false, mensaje: "No se reconoció el enlace." })
            return;
        }
        const validar_token = (await Tokens.find({ token }, 'activo').limit(1))[0];
        if (!validar_token) {
            res.status(200).json({ estado: false, mensaje: "No hay un enlace activo." })
            return;
        }
        if (!validar_token.activo) {
            res.status(200).json({ estado: false, mensaje: "El enlace ya expiró." })
            return;
        }
        const visitante = (await Visitantes.find({ correo: decoded.correo }, {
            nombre: 1,
            apellido_pat: 1,
            apellido_mat: 1,
            telefono: 1,
            empresa: 1,
            activo: 1
        }).limit(1))[0];
        if (!visitante) {
            res.status(200).json({ estado: false, mensaje: "No se encontro al visitante ligado al correo." })
            return;
        }
        if (!visitante.activo) {
            res.status(200).json({ estado: false, mensaje: "Esta bloqueado temporalmente, pide asistencia de tu anfitrión o de un administrador." })
            return;
        }
        if (dayjs(decoded.fecha_entrada).isBefore(dayjs())) {
            res.status(200).json({ estado: false, mensaje: "El enlace ya expiró." });
            await Tokens.findOneAndUpdate({ token }, { $set: { activo: false, fecha_modificacion: Date.now() } })
            return;
        }
        const anfitrion = await Usuarios.findById(decoded.id_anfitrion, {
            nombre: {
                $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
            },
            telefono: 1,
            correo: 1,
            activo: 1
        });
        if (!anfitrion) {
            res.status(200).json({ estado: false, mensaje: "El anfitrión ligado a este enlace no existe." })
            return;
        }
        if (!anfitrion.activo) {
            res.status(200).json({ estado: false, mensaje: "El anfitrión ligado a este enlace fue dado de baja." })
            return;
        }
        res.status(200).json({ estado: true, datos: { anfitrion, visitante, correo: decoded.correo, fecha_entrada: decoded.fecha_entrada } })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crearRegistroVisitante(req: Request, res: Response): Promise<void> {
    try {
        const { token } = req.body;
        const decoded = jwt.verify(token, CONFIG.SECRET_EMAIL) as { correo: string; fecha_entrada: string; id_anfitrion: string; accesos: [] };

        if (!decoded) {
            res.status(200).json({ estado: false, mensaje: "No se reconoció el enlace." })
            return;
        }
        const validar_token = (await Tokens.find({ token }, 'activo').limit(1))[0];
        if (!validar_token) {
            res.status(200).json({ estado: false, mensaje: "No hay un enlace activo." })
            return;
        }
        if (!validar_token.activo) {
            res.status(200).json({ estado: false, mensaje: "El enlace ya expiró." })
            return;
        }

        const visitante = (await Visitantes.find({ correo: decoded.correo }, 'codigo activo').limit(1))[0];
        if (!visitante) {
            res.status(200).json({ estado: false, mensaje: "No se encontro al visitante ligado al correo." })
            return;
        }
        if (!visitante.activo) {
            res.status(200).json({ estado: false, mensaje: "Esta bloqueado temporalmente, pide asistencia de tu anfitrión o de un administrador." })
            return;
        }
        if (dayjs(decoded.fecha_entrada).isBefore(dayjs())) {
            res.status(200).json({ estado: false, mensaje: "El enlace ya expiró." });
            await Visitantes.findOneAndUpdate({ token }, { $set: { activo: false, fecha_modificacion: Date.now() } })
            return;
        }
        const anfitrion = await Usuarios.findById(decoded.id_anfitrion, 'activo');
        if (!anfitrion) {
            res.status(200).json({ estado: false, mensaje: "El anfitrión ligado a este enlace no existe." })
            return;
        }
        if (!anfitrion.activo) {
            res.status(200).json({ estado: false, mensaje: "El anfitrión ligado a este enlace fue dado de baja." })
            return;
        }

        const {
            tipo_ide,
            numero_ide,
            img_ide_a,
            img_ide_b,
            nombre,
            apellido_pat,
            apellido_mat,
            telefono,
            empresa,
            actividades,
            comentarios,
            placas,
            desc_vehiculo,
        } = req.body;

        await Visitantes.updateOne({ _id: visitante._id }, {
            nombre,
            apellido_pat,
            apellido_mat,
            telefono,
            empresa,
            creado_por: visitante._id || null,
        })
        const docsEmpresa = await consultarDocumentacionEmpresa(decoded.id_anfitrion);
        const docs = await consultarDocumentacion(visitante._id, docsEmpresa);
        const docsFaltantesNum = docsEmpresa.filter((doc_emp) => !docs.some((doc: { tipo: number }) => doc.tipo === doc_emp));
        const docsFaltantes: string[] = [];
        for await (const doc of docsFaltantesNum) {
            const doc_name = await TiposDocumentos.findOne({ tipo: doc }, 'nombre');
            if (doc_name) {
                docsFaltantes.push(doc_name.nombre)
            }
        }
        let seEnvioCorreoVisit = 0;
        let seEnvioCorreoAnfit = 0;
        const registrosCreadosWS: string[] = [];
        const { tiempoToleranciaSalida, tiempoToleranciaEntrada, habilitarIntegracionHv } = await Configuracion.findOne({}, 'tiempoToleranciaSalida tiempoToleranciaEntrada habilitarIntegracionHv') as IConfiguracion;
        const tiempoSalida = Number(tiempoToleranciaSalida.split('/')[0]);
        const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
        const tipoSalida = tiempoToleranciaSalida.split('/')[1] as ManipulateType;
        const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;

        const nuevoRegistro = new Registros({
            codigo: visitante.codigo,
            tipo_registro: 1,
            tipo_ide,
            numero_ide,
            img_ide_a,
            img_ide_b,
            nombre,
            apellido_pat,
            apellido_mat,
            correo: decoded.correo,
            telefono,
            empresa,
            id_anfitrion: decoded.id_anfitrion,
            fecha_entrada: dayjs(decoded.fecha_entrada).toDate(),
            actividades,
            accesos: decoded.accesos,
            comentarios,
            placas,
            desc_vehiculo,
            documentos: docs.map((item) => item._id),
            creado_por: visitante._id || null,
        });
        const mensajes = await validarModelo(nuevoRegistro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.',
                mensajes: { ...mensajes, docs_faltantes: `Aún no se suben los siguientes documentos: ${docsFaltantes.join(" - ")}` }
            });
            return;
        }

        await nuevoRegistro.save();
        const registroUpdated = await cambiarEventoRegistro({
            tipo_dispositivo: 1,
            tipo_check: 1,
            id_registro: nuevoRegistro._id,
            id_visitante: visitante._id
        }) as IRegistro;

        if (habilitarIntegracionHv) {
            const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registroUpdated.accesos.filter((item) => item.modo == 2).map((item) => item.id_acceso) } });
            const entrada = dayjs(decoded.fecha_entrada).subtract(tiempoEntrada, tipoEntrada);
            const salida = dayjs().add(12, "hours").add(tiempoSalida, tipoSalida);

            for (const panel of paneles) {
                const { direccion_ip, usuario, contrasena } = panel;
                const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                await HVPANEL.saveRegister({ ...registroUpdated, fecha_entrada: entrada.toDate(), fecha_salida: salida.toDate(), activo: true });
            }
        }
        registrosCreadosWS.push(nuevoRegistro._id.toString());


        if (registrosCreadosWS.length > 0) {
            seEnvioCorreoVisit = await enviarCorreoCitaVisitante(visitante.codigo, registrosCreadosWS, docsFaltantes.join(" - "));
            seEnvioCorreoAnfit = await enviarCorreoCitaAnfitrion(registrosCreadosWS);
        }
        await Tokens.findOneAndUpdate({ token }, { $set: { activo: false, fecha_modificacion: Date.now() } })

        socket?.emit("registros:notificar-nuevos", {
            registros: registrosCreadosWS,
        });
        res.status(200).json({
            estado: true,
            datos: {
                correos_enviados: {
                    anfitrion: seEnvioCorreoAnfit > 0,
                    visitante: seEnvioCorreoVisit > 0
                }
            },
            ws: {
                registros_creados: registrosCreadosWS
            }
        });
    } catch (error: any) {
        console.error(error);
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
