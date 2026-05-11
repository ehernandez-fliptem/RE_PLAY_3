import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Excel, { CellFormulaValue, CellHyperlinkValue, CellValue, Column } from 'exceljs';
import fs from 'fs';
import { execFile } from "child_process";
import { Types, PipelineStage } from 'mongoose';
import QRCode from 'qrcode';
import { UserRequest } from '../types/express';
import { QueryParams } from '../types/queryparams';
import Empleados, { IEmpleado } from '../models/Empleados';
import Usuarios, { IUsuario } from '../models/Usuarios';
import Empresas, { IEmpresa } from '../models/Empresas';
import Departamentos from '../models/Departamentos';
import Puestos from '../models/Puestos';
import { IPiso } from '../models/Pisos';
import { IAcceso } from '../models/Accesos';
import DispositivosHv from '../models/DispositivosHv';
import DispositivosBiostar from '../models/DispositivosBiostar';
import BiostarConexion from "../models/BiostarConexion";
import Configuracion, { IConfiguracion } from '../models/Configuracion';
import Roles from '../models/Roles';
import Hikvision from '../classes/Hikvision';
import { biostarRequest } from "../classes/Biostar";
import { generarCodigoUnico, isEmptyObject, decryptPassword, encryptPassword, resizeImage, customAggregationForDataGrids, marcarDuplicados } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import { enviarCorreoUsuario } from '../utils/correos';
import { fecha, log } from "../middlewares/log";

import { CONFIG } from "../config";

import FaceDetector from '../classes/FaceDetector';
import FaceDescriptors from '../models/FaceDescriptors';
const faceDetector = new FaceDetector();


export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
        const biostarGroupId = String((req.query as any)?.biostar_group_id || "").trim();
        const biostarLive = String((req.query as any)?.biostar_live || "").trim() === "1";
        const estadoFiltro = String((req.query as any)?.estado || "activos").trim().toLowerCase();

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
            ["id_empleado", "empresa", "nombre", "correo", "puesto", "departamento", "cubiculo", "telefono", "movil"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        isMaster ? {} : { id_empresa: new Types.ObjectId(id_empresa) },
                        estadoFiltro === "inactivos" ? { activo: false } : estadoFiltro === "todos" ? {} : { activo: true },
                        biostarGroupId ? { biostar_group_id: biostarGroupId, biostar_user_id: { $nin: ["", null] } } : {},
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
                $set: {
                    empresa: { $arrayElemAt: ["$empresa", -1] }
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
                    id_empleado: { $toString: "$id_empleado" },
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
                    huellas_total: { $size: { $ifNull: ["$huellas_registradas", []] } },
                    tarjetas_total: { $size: { $ifNull: ["$tarjetas_registradas", []] } },
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
                    huellas_registradas: 0,
                    tarjetas_registradas: 0,
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
                $sort: sortMDB ? sortMDB : { id_empleado: 1 }
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
        );
        const registros = await Empleados.aggregate(aggregation);
        const result = registros?.[0] || { paginatedResults: [], totalCount: [{ count: 0 }] };

        if (biostarLive && Array.isArray(result.paginatedResults) && result.paginatedResults.length > 0) {
            const conexion = await getBiostarConexionActiva();
            if (conexion) {
                const pageRows = (result.paginatedResults || []) as any[];
                const bioUserIds = Array.from(
                    new Set(
                        pageRows
                            .map((r: any) => String(r?.biostar_user_id || "").trim())
                            .filter(Boolean)
                    )
                );

                let liveRows: any[] = [];
                if (bioUserIds.length > 0) {
                    const liveByIds = await biostarRequest(conexion, {
                        method: "POST",
                        url: "/api/v2/users/search?noblockui",
                        data: { limit: 1000, offset: 0, user_id_list: bioUserIds },
                    });
                    if (liveByIds.ok) {
                        liveRows = (liveByIds.data?.UserCollection?.rows || []) as any[];
                    } else {
                        const groupIds = Array.from(
                            new Set(
                                pageRows
                                    .map((r: any) => String(r?.biostar_group_id || "").trim())
                                    .filter(Boolean)
                            )
                        );
                        if (groupIds.length > 0) {
                            const liveByGroups = await biostarRequest(conexion, {
                                method: "POST",
                                url: "/api/v2/users/search?noblockui",
                                data: { limit: 1000, offset: 0, user_group_id_list: groupIds },
                            });
                            if (liveByGroups.ok) {
                                liveRows = (liveByGroups.data?.UserCollection?.rows || []) as any[];
                            }
                        }
                    }
                }

                if (liveRows.length > 0) {
                    const liveIds = new Set(liveRows.map((u: any) => String(u?.user_id || "").trim()).filter(Boolean));
                    const liveById = new Map<string, any>();
                    for (const u of liveRows) {
                        const uid = String(u?.user_id || "").trim();
                        if (uid) liveById.set(uid, u);
                    }

                    const rowsFiltered = pageRows.filter((r: any) => {
                        const bioUserId = String(r?.biostar_user_id || "").trim();
                        if (!bioUserId) return true;
                        if (!liveIds.has(bioUserId)) return false;
                        const liveUser = liveById.get(bioUserId);
                        return !isBiostarAdminUser(liveUser);
                    });

                    // Refleja grupo real desde BioStar para evitar desalineación en filtros.
                    const bulkOps: any[] = [];
                    result.paginatedResults = rowsFiltered.map((r: any) => {
                        const bioUserId = String(r?.biostar_user_id || "").trim();
                        if (!bioUserId) return r;
                        const liveUser = liveById.get(bioUserId);
                        if (!liveUser) return r;
                        const liveGroupId = String(liveUser?.user_group_id?.id || "").trim();
                        const liveGroupName = String(liveUser?.user_group_id?.name || "").trim();
                        if (
                            liveGroupId &&
                            (liveGroupId !== String(r?.biostar_group_id || "").trim() ||
                                liveGroupName !== String(r?.biostar_group_name || "").trim())
                        ) {
                            bulkOps.push({
                                updateOne: {
                                    filter: { _id: new Types.ObjectId(String(r._id)) },
                                    update: {
                                        $set: {
                                            biostar_group_id: liveGroupId,
                                            biostar_group_name: liveGroupName,
                                        },
                                    },
                                },
                            });
                        }
                        return {
                            ...r,
                            biostar_group_id: liveGroupId || r.biostar_group_id,
                            biostar_group_name: liveGroupName || r.biostar_group_name,
                        };
                    });

                    if (bulkOps.length > 0) {
                        await Empleados.bulkWrite(bulkOps);
                    }
                } else {
                    // Si BioStar no devolvió usuarios para los IDs de la página, ocultamos los que ya no existen.
                    result.paginatedResults = pageRows.filter((r: any) => !String(r?.biostar_user_id || "").trim());
                }
            }
        }

        res.status(200).json({ estado: true, datos: result });
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
        const esAdmin = rol.includes(1) || rol.includes(2);
        const esRecep = rol.includes(5);
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
                $sort: sortMDB ? sortMDB : { id_empleado: 1 }
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
        );
        const registros = await Empleados.aggregate(aggregation);
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
        const esAdmin = rol.includes(1) || rol.includes(2);
        const esRecep = rol.includes(5);
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
                $sort: sortMDB ? sortMDB : { id_empleado: 1 }
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
        );
        const registros = await Empleados.aggregate(aggregation);
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
        const esAdmin = rol.includes(1) || rol.includes(2);
        const esRecep = rol.includes(5);
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;

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
                        (isMaster && (esAdmin || esRecep)) ? {} : { id_empresa },
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
        );
        const registros = await Empleados.aggregate(aggregation);
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
        const registro = await Empleados.aggregate([
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
                    as: "accesos",
                    let: { empresaId: "$_id", empresaAccesos: "$accesos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaAccesos"] }
                                    ]
                                }
                            }
                        },
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

export async function obtenerFormNuevoEmpleado(req: Request, res: Response): Promise<void> {
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
                    as: "puestos",
                    let: { empresaId: "$_id", empresaPuestos: "$puestos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaPuestos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
                    as: "departamentos",
                    let: { empresaId: "$_id", empresaDepartamentos: "$departamentos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaDepartamentos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
                    as: "cubiculos",
                    let: { empresaId: "$_id", empresaCubiculos: "$cubiculos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaCubiculos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
                    as: "accesos",
                    let: { empresaId: "$_id", empresaAccesos: "$accesos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaAccesos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
        const { habilitarIntegracionBiostar } = await Configuracion.findOne({}, "habilitarIntegracionBiostar") as IConfiguracion;
        let biostarGrupos: Array<{ id_externo: string; nombre: string }> = [];
        if (habilitarIntegracionBiostar) {
            const conexion = await getBiostarConexionActiva();
            if (conexion) {
                const r = await biostarRequest(conexion, { method: "GET", url: "/api/user_groups?limit=1000" });
                const rows = (r.data?.UserGroupCollection?.rows || []) as any[];
                biostarGrupos = rows
                    .map((row) => ({ id_externo: String(row?.id || ""), nombre: String(row?.name || "").trim() }))
                    .filter((g) => g.id_externo && g.nombre);
            }
        }
        res.status(200).json({ estado: true, datos: { empresas, biostarGrupos, habilitarIntegracionBiostar: !!habilitarIntegracionBiostar } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarEmpleado(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;
        const usuario = await Empleados.aggregate([
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
                    as: "puestos",
                    let: { empresaId: "$_id", empresaPuestos: "$puestos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaPuestos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
                    as: "departamentos",
                    let: { empresaId: "$_id", empresaDepartamentos: "$departamentos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaDepartamentos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
                    as: "cubiculos",
                    let: { empresaId: "$_id", empresaCubiculos: "$cubiculos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaCubiculos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
                    as: "accesos",
                    let: { empresaId: "$_id", empresaAccesos: "$accesos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ["$$empresaId", "$empresas"] },
                                        { $in: ["$_id", "$$empresaAccesos"] },
                                        { $eq: [{ $size: { $ifNull: ["$empresas", []] } }, 0] }
                                    ]
                                }
                            }
                        },
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
        const { habilitarIntegracionBiostar } = await Configuracion.findOne({}, "habilitarIntegracionBiostar") as IConfiguracion;
        let biostarGrupos: Array<{ id_externo: string; nombre: string }> = [];
        if (habilitarIntegracionBiostar) {
            const conexion = await getBiostarConexionActiva();
            if (conexion) {
                const r = await biostarRequest(conexion, { method: "GET", url: "/api/user_groups?limit=1000" });
                const rows = (r.data?.UserGroupCollection?.rows || []) as any[];
                biostarGrupos = rows
                    .map((row) => ({ id_externo: String(row?.id || ""), nombre: String(row?.name || "").trim() }))
                    .filter((g) => g.id_externo && g.nombre);
            }
        }
        res.status(200).json({
            estado: true, datos: {
                usuario: usuario[0], empresas, biostarGrupos, habilitarIntegracionBiostar: !!habilitarIntegracionBiostar
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

const mapEmpleadoToPanel = (registro: any) => {
    const base = registro?.toObject ? registro.toObject() : registro;
    return {
        ...base,
        id_general: base?.id_empleado ?? base?.id_general
    };
};

const runCurlText = (args: string[]): Promise<{ statusCode: number; body: string; }> =>
    new Promise((resolve, reject) => {
        execFile(
            "curl",
            [...args, "-w", "\n__HTTP_STATUS__:%{http_code}"],
            { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(String(stderr || error.message || "Error ejecutando curl").trim()));
                }
                const out = String(stdout || "").trim();
                const marker = "__HTTP_STATUS__:";
                const markerIdx = out.lastIndexOf(marker);
                if (markerIdx < 0) {
                    return resolve({ statusCode: 0, body: out });
                }
                const body = out.slice(0, markerIdx).trim();
                const statusCode = Number(out.slice(markerIdx + marker.length).trim()) || 0;
                resolve({ statusCode, body });
            }
        );
    });

const xmlTagValue = (xml: string, tag: string): string => {
    const match = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return String(match?.[1] || "").trim();
};

const parseXmlStatus = (xml: string) => ({
    statusString: xmlTagValue(xml, "statusString"),
    subStatusCode: xmlTagValue(xml, "subStatusCode"),
    errorMsg: xmlTagValue(xml, "errorMsg"),
});

type TarjetaWeb = {
    id: string;
    nombre: string;
    descripcion?: string;
    card_no: string;
    fecha_creacion: Date;
};

const normalizeHuellaTemplateMap = (value: any): Record<string, string> => {
    if (!value) return {};
    if (value instanceof Map) {
        return Object.fromEntries(Array.from(value.entries()).map(([k, v]) => [String(k), String(v)]));
    }
    if (typeof value?.toObject === "function") {
        const obj = value.toObject();
        if (obj && typeof obj === "object") return obj as Record<string, string>;
    }
    if (typeof value === "object") {
        return value as Record<string, string>;
    }
    return {};
};

const normalizeTarjetasWeb = (value: any): TarjetaWeb[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => ({
            id: String(item?.id || ""),
            nombre: String(item?.nombre || "").trim(),
            descripcion: String(item?.descripcion || "").trim(),
            card_no: String(item?.card_no || "").trim(),
            fecha_creacion: item?.fecha_creacion ? new Date(item.fecha_creacion) : new Date(),
        }))
        .filter((item) => item.id && item.nombre && item.card_no);
};

const findFirstStringByKeys = (value: any, keys: string[]): string => {
    if (!value || typeof value !== "object") return "";
    if (Array.isArray(value)) {
        for (const item of value) {
            const result = findFirstStringByKeys(item, keys);
            if (result) return result;
        }
        return "";
    }
    for (const key of keys) {
        const direct = value?.[key];
        if (typeof direct === "string" && direct.trim()) {
            return direct.trim();
        }
    }
    for (const key of Object.keys(value)) {
        const result = findFirstStringByKeys(value[key], keys);
        if (result) return result;
    }
    return "";
};

const captureFingerprintFromPanel = async (ip: string, user: string, pass: string, fingerNo: number) => {
    const xmlPayload =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">` +
        `<fingerNo>${fingerNo}</fingerNo>` +
        `</CaptureFingerPrintCond>`;
    let response: { statusCode: number; body: string; } | null = null;
    let lastError: any = null;
    for (const protocol of ["https", "http"]) {
        try {
            response = await runCurlText([
                "-k",
                "--digest",
                "-u",
                `${user}:${pass}`,
                "-H",
                "Content-Type: application/xml",
                "-X",
                "POST",
                `${protocol}://${ip}/ISAPI/AccessControl/CaptureFingerPrint`,
                "-d",
                xmlPayload,
            ]);
            break;
        } catch (error: any) {
            lastError = error;
        }
    }
    if (!response) {
        throw new Error(lastError?.message || "No se pudo conectar al panel maestro para capturar huella.");
    }
    const { statusCode, body } = response;
    const fingerData = xmlTagValue(body, "fingerData");
    const fingerPrintQuality = Number(xmlTagValue(body, "fingerPrintQuality")) || 0;
    if (statusCode >= 400 || !fingerData) {
        const parsed = parseXmlStatus(body);
        const timeout = parsed.subStatusCode === "captureTimeout" || parsed.errorMsg === "captureTimeout";
        throw new Error(
            timeout
                ? "No se detectó la huella a tiempo. Intenta de nuevo y coloca el dedo en el lector."
                : parsed.errorMsg || parsed.subStatusCode || parsed.statusString || "No se pudo capturar la huella en el panel maestro."
        );
    }
    return { fingerData, fingerPrintQuality };
};

const setupFingerprintOnPanel = async (ip: string, user: string, pass: string, employeeNo: string, fingerNo: number, fingerData: string) => {
    const payload = {
        FingerPrintCfg: {
            employeeNo: String(employeeNo),
            fingerPrintID: Number(fingerNo),
            fingerType: "normalFP",
            fingerData: String(fingerData),
            enableCardReader: [1, 2],
        },
    };
    let response: { statusCode: number; body: string; } | null = null;
    let lastError: any = null;
    for (const protocol of ["https", "http"]) {
        try {
            response = await runCurlText([
                "-k",
                "--digest",
                "-u",
                `${user}:${pass}`,
                "-H",
                "Content-Type: application/json",
                "-X",
                "POST",
                `${protocol}://${ip}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`,
                "-d",
                JSON.stringify(payload),
            ]);
            break;
        } catch (error: any) {
            lastError = error;
        }
    }
    if (!response) {
        throw new Error(lastError?.message || "No se pudo conectar al panel para aplicar huella.");
    }
    const { statusCode, body } = response;
    if (statusCode >= 400) {
        throw new Error("El panel rechazó la configuración de huella.");
    }

    let parsed: any = null;
    try {
        parsed = JSON.parse(body);
    } catch {
        parsed = null;
    }

    const statusList = Array.isArray(parsed?.FingerPrintStatus?.StatusList) ? parsed.FingerPrintStatus.StatusList : [];
    const okReaders = statusList.filter((item: any) => Number(item?.cardReaderRecvStatus) === 1).length;
    const applied = statusList.length === 0 ? true : okReaders > 0;
    return { applied, statusList };
};

const captureCardFromPanel = async (ip: string, user: string, pass: string) => {
    let response: { statusCode: number; body: string; } | null = null;
    let lastError: any = null;
    for (const protocol of ["https", "http"]) {
        try {
            response = await runCurlText([
                "-k",
                "--digest",
                "-u",
                `${user}:${pass}`,
                "-X",
                "GET",
                `${protocol}://${ip}/ISAPI/AccessControl/CaptureCardInfo?format=json`,
            ]);
            break;
        } catch (error: any) {
            lastError = error;
        }
    }

    if (!response) {
        throw new Error(lastError?.message || "No se pudo conectar al panel maestro para capturar tarjeta.");
    }

    const { statusCode, body } = response;
    let parsed: any = null;
    try {
        parsed = JSON.parse(body);
    } catch {
        parsed = null;
    }

    const cardNo = findFirstStringByKeys(parsed, ["cardNo", "CardNo", "cardNumber", "card_id"]);
    if (statusCode >= 400 || !cardNo) {
        const subStatusCode = String(parsed?.subStatusCode || "").trim();
        const errorMsg = String(parsed?.errorMsg || "").trim();
        const timeout = subStatusCode.toLowerCase().includes("timeout") || errorMsg.toLowerCase().includes("timeout");
        throw new Error(
            timeout
                ? "No se detectó la tarjeta a tiempo. Intenta de nuevo y acércala al lector."
                : errorMsg || subStatusCode || String(parsed?.statusString || "").trim() || "No se pudo capturar la tarjeta en el panel maestro."
        );
    }

    return { cardNo };
};

const setupCardOnPanel = async (
    ip: string,
    user: string,
    pass: string,
    employeeNo: string,
    cardNo: string
) => {
    const payload = {
        CardInfo: {
            employeeNo: String(employeeNo),
            cardNo: String(cardNo),
            cardType: "normalCard",
        },
    };

    let response: { statusCode: number; body: string; } | null = null;
    let lastError: any = null;
    for (const protocol of ["https", "http"]) {
        try {
            response = await runCurlText([
                "-k",
                "--digest",
                "-u",
                `${user}:${pass}`,
                "-H",
                "Content-Type: application/json",
                "-X",
                "POST",
                `${protocol}://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`,
                "-d",
                JSON.stringify(payload),
            ]);
            break;
        } catch (error: any) {
            lastError = error;
        }
    }

    if (!response) {
        throw new Error(lastError?.message || "No se pudo conectar al panel para aplicar tarjeta.");
    }

    const { statusCode, body } = response;
    let parsed: any = null;
    try {
        parsed = JSON.parse(body);
    } catch {
        parsed = null;
    }

    if (statusCode >= 400) {
        throw new Error("El panel rechazó la configuración de tarjeta.");
    }

    const subStatusCode = String(parsed?.subStatusCode || "").trim();
    const alreadyExist = subStatusCode === "cardNoAlreadyExist";
    const ok = !parsed?.statusCode || Number(parsed?.statusCode) === 1 || alreadyExist;

    if (!ok) {
        throw new Error(
            String(parsed?.errorMsg || parsed?.statusString || subStatusCode || "El panel no confirmó la configuración de tarjeta.")
        );
    }

    return { applied: true };
};

export async function obtenerBiometriaEmpleado(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;

        const filtro: any = { _id: req.params.id };
        if (!isMaster) filtro.id_empresa = id_empresa;

        const registro = await Empleados.findOne(
            filtro,
            "nombre apellido_pat apellido_mat huellas_registradas huellas_template_dev tarjetas_registradas tarjetas_web"
        ).lean();

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const nombreCompleto = `${registro.nombre || ""} ${registro.apellido_pat || ""} ${registro.apellido_mat || ""}`.trim();
        const huellas = Array.isArray(registro.huellas_registradas) ? registro.huellas_registradas : [];
        const tarjetas = Array.isArray(registro.tarjetas_registradas) ? registro.tarjetas_registradas : [];
        const tarjetasWeb = normalizeTarjetasWeb((registro as any)?.tarjetas_web);
        const huellasTemplateDev = normalizeHuellaTemplateMap((registro as any)?.huellas_template_dev);
        const huellasTemplateDevKeys = Object.keys(huellasTemplateDev)
            .map((key) => Number(key))
            .filter((key) => Number.isInteger(key) && key >= 1 && key <= 10)
            .sort((a, b) => a - b);

        res.status(200).json({
            estado: true,
            datos: {
                _id: registro._id,
                nombre: nombreCompleto,
                huellas_registradas: huellas.sort((a, b) => a - b),
                tarjetas_registradas: tarjetas,
                tarjetas_web: tarjetasWeb,
                huellas_total: huellas.length,
                tarjetas_total: tarjetas.length,
                dev_huella_replay_enabled: true,
                huellas_template_dev: huellasTemplateDevKeys,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function registrarHuellaEmpleado(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
        const dedo = Number(req.body?.dedo);

        if (!Number.isInteger(dedo) || dedo < 1 || dedo > 10) {
            res.status(400).json({ estado: false, mensaje: "El dedo es inválido. Usa un valor entre 1 y 10." });
            return;
        }

        const filtro: any = { _id: req.params.id };
        if (!isMaster) filtro.id_empresa = id_empresa;

        const registro = await Empleados.findOne(filtro);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const huellasActuales = Array.isArray(registro.huellas_registradas) ? registro.huellas_registradas : [];
        const huellas = Array.from(new Set([...huellasActuales, dedo])).sort((a, b) => a - b);

        await Empleados.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    huellas_registradas: huellas,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                },
            },
            { runValidators: true }
        );

        res.status(200).json({
            estado: true,
            mensaje: "Huella registrada correctamente.",
            datos: {
                huellas_registradas: huellas,
                huellas_total: huellas.length,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function registrarHuellaEmpleadoPanel(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
        const dedo = Number(req.body?.dedo);

        if (!Number.isInteger(dedo) || dedo < 1 || dedo > 10) {
            res.status(400).json({ estado: false, mensaje: "El dedo es inválido. Usa un valor entre 1 y 10." });
            return;
        }

        const config = await Configuracion.findOne({}, "habilitarIntegracionHv habilitarIntegracionHvBiometria");
        if (!config?.habilitarIntegracionHv || !config?.habilitarIntegracionHvBiometria) {
            res.status(200).json({
                estado: false,
                mensaje: "La integración biométrica de Hikvision está desactivada.",
            });
            return;
        }

        const filtro: any = { _id: req.params.id };
        if (!isMaster) filtro.id_empresa = id_empresa;

        const registro = await Empleados.findOne(filtro);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const panelMaestro = await DispositivosHv.findOne({ activo: true, es_panel_maestro: true }).lean();
        if (!panelMaestro) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay panel maestro configurado para captura de huella.",
            });
            return;
        }

        const panelesAcceso = await DispositivosHv.find({
            activo: true,
            tipo_evento: { $in: [5, 6, 7] },
            id_acceso: { $in: Array.isArray(registro.accesos) ? registro.accesos : [] },
        }).lean();

        const panelesDestinoMap = new Map<string, any>();
        panelesDestinoMap.set(String(panelMaestro._id), panelMaestro);
        for (const panel of panelesAcceso) {
            panelesDestinoMap.set(String(panel._id), panel);
        }
        const panelesDestino = Array.from(panelesDestinoMap.values());
        if (panelesDestino.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay paneles destino disponibles para aplicar la huella.",
            });
            return;
        }

        const employeeNo = String(registro.id_empleado);
        const masterUser = String(panelMaestro.usuario || "").trim();
        const masterPass = decryptPassword(String(panelMaestro.contrasena || ""), CONFIG.SECRET_CRYPTO);
        const { fingerData, fingerPrintQuality } = await captureFingerprintFromPanel(
            String(panelMaestro.direccion_ip),
            masterUser,
            masterPass,
            dedo
        );

        const paneles_aplicados: string[] = [];
        const paneles_fallidos: Array<{ panel: string; mensaje: string; }> = [];

        for (const panel of panelesDestino) {
            const panelNombre = String(panel.nombre || panel.direccion_ip || panel._id);
            try {
                const panelUser = String(panel.usuario || "").trim();
                const panelPass = decryptPassword(String(panel.contrasena || ""), CONFIG.SECRET_CRYPTO);
                const setupRes = await setupFingerprintOnPanel(
                    String(panel.direccion_ip),
                    panelUser,
                    panelPass,
                    employeeNo,
                    dedo,
                    fingerData
                );
                if (setupRes.applied) {
                    paneles_aplicados.push(panelNombre);
                } else {
                    paneles_fallidos.push({
                        panel: panelNombre,
                        mensaje: "El panel no confirmó la aplicación de la huella.",
                    });
                }
            } catch (error: any) {
                paneles_fallidos.push({
                    panel: panelNombre,
                    mensaje: error?.message || "Error al aplicar huella en panel.",
                });
            }
        }

        if (paneles_aplicados.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No se pudo aplicar la huella en ningún panel.",
                datos: { paneles_fallidos },
            });
            return;
        }

        const huellasActuales = Array.isArray(registro.huellas_registradas) ? registro.huellas_registradas : [];
        const huellas = Array.from(new Set([...huellasActuales, dedo])).sort((a, b) => a - b);
        const huellasTemplateDevActual = normalizeHuellaTemplateMap((registro as any)?.huellas_template_dev);
        const huellasTemplateDev = {
            ...huellasTemplateDevActual,
            [String(dedo)]: encryptPassword(String(fingerData), CONFIG.SECRET_CRYPTO),
        };

        await Empleados.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    huellas_registradas: huellas,
                    huellas_template_dev: huellasTemplateDev,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                },
            },
            { runValidators: true }
        );

        res.status(200).json({
            estado: true,
            mensaje: paneles_fallidos.length > 0
                ? `Huella registrada. Aplicada en ${paneles_aplicados.length} panel(es) y con fallas en ${paneles_fallidos.length}.`
                : "Huella registrada correctamente.",
            datos: {
                huellas_registradas: huellas,
                huellas_total: huellas.length,
                finger_quality: fingerPrintQuality,
                paneles_aplicados,
                paneles_fallidos,
                dev_huella_replay_enabled: true,
                huellas_template_dev: Object.keys(huellasTemplateDev).map(Number).sort((a, b) => a - b),
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function reenviarHuellaEmpleadoPanel(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
        const dedo = Number(req.body?.dedo);

        if (!Number.isInteger(dedo) || dedo < 1 || dedo > 10) {
            res.status(400).json({ estado: false, mensaje: "El dedo es inválido. Usa un valor entre 1 y 10." });
            return;
        }

        const filtro: any = { _id: req.params.id };
        if (!isMaster) filtro.id_empresa = id_empresa;

        const registro = await Empleados.findOne(filtro);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const templates = normalizeHuellaTemplateMap((registro as any)?.huellas_template_dev);
        const templateEncrypted = templates[String(dedo)];
        if (!templateEncrypted) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay plantilla guardada para ese dedo.",
            });
            return;
        }
        const fingerData = decryptPassword(String(templateEncrypted), CONFIG.SECRET_CRYPTO);
        if (!fingerData) {
            res.status(200).json({
                estado: false,
                mensaje: "No se pudo leer la plantilla guardada.",
            });
            return;
        }

        const panelesAcceso = await DispositivosHv.find({
            activo: true,
            tipo_evento: { $in: [5, 6, 7] },
            id_acceso: { $in: Array.isArray(registro.accesos) ? registro.accesos : [] },
        }).lean();
        if (panelesAcceso.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay paneles destino disponibles para reenviar la huella.",
            });
            return;
        }

        const employeeNo = String(registro.id_empleado);
        const paneles_aplicados: string[] = [];
        const paneles_fallidos: Array<{ panel: string; mensaje: string; }> = [];

        for (const panel of panelesAcceso) {
            const panelNombre = String(panel.nombre || panel.direccion_ip || panel._id);
            try {
                const panelUser = String(panel.usuario || "").trim();
                const panelPass = decryptPassword(String(panel.contrasena || ""), CONFIG.SECRET_CRYPTO);
                const setupRes = await setupFingerprintOnPanel(
                    String(panel.direccion_ip),
                    panelUser,
                    panelPass,
                    employeeNo,
                    dedo,
                    fingerData
                );
                if (setupRes.applied) {
                    paneles_aplicados.push(panelNombre);
                } else {
                    paneles_fallidos.push({
                        panel: panelNombre,
                        mensaje: "El panel no confirmó la aplicación de la huella.",
                    });
                }
            } catch (error: any) {
                paneles_fallidos.push({
                    panel: panelNombre,
                    mensaje: error?.message || "Error al aplicar huella en panel.",
                });
            }
        }

        if (paneles_aplicados.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No se pudo reenviar la huella a ningún panel.",
                datos: { paneles_fallidos },
            });
            return;
        }

        res.status(200).json({
            estado: true,
            mensaje: paneles_fallidos.length > 0
                ? `Huella reenviada en ${paneles_aplicados.length} panel(es) y con fallas en ${paneles_fallidos.length}.`
                : "Huella reenviada correctamente.",
            datos: {
                paneles_aplicados,
                paneles_fallidos,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function registrarTarjetaEmpleadoPanel(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, "id_empresa") as IUsuario;

        const nombre = String(req.body?.nombre || "").trim();
        const descripcion = String(req.body?.descripcion || "").trim();
        if (!nombre) {
            res.status(400).json({ estado: false, mensaje: "El nombre de la tarjeta es obligatorio." });
            return;
        }

        const config = await Configuracion.findOne({}, "habilitarIntegracionHv habilitarIntegracionHvBiometria");
        if (!config?.habilitarIntegracionHv || !config?.habilitarIntegracionHvBiometria) {
            res.status(200).json({
                estado: false,
                mensaje: "La integración biométrica de Hikvision está desactivada.",
            });
            return;
        }

        const filtro: any = { _id: req.params.id };
        if (!isMaster) filtro.id_empresa = id_empresa;

        const registro = await Empleados.findOne(filtro);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const tarjetasWebActual = normalizeTarjetasWeb((registro as any)?.tarjetas_web);
        if (tarjetasWebActual.length >= 10) {
            res.status(200).json({
                estado: false,
                mensaje: "Se alcanzó el límite de 10 tarjetas. Borra una tarjeta para continuar.",
            });
            return;
        }

        const panelMaestro = await DispositivosHv.findOne({ activo: true, es_panel_maestro: true }).lean();
        if (!panelMaestro) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay panel maestro configurado para captura de tarjeta.",
            });
            return;
        }

        const panelesAcceso = await DispositivosHv.find({
            activo: true,
            tipo_evento: { $in: [5, 6, 7] },
            id_acceso: { $in: Array.isArray(registro.accesos) ? registro.accesos : [] },
        }).lean();

        const panelesDestinoMap = new Map<string, any>();
        panelesDestinoMap.set(String(panelMaestro._id), panelMaestro);
        for (const panel of panelesAcceso) {
            panelesDestinoMap.set(String(panel._id), panel);
        }
        const panelesDestino = Array.from(panelesDestinoMap.values());
        if (panelesDestino.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No hay paneles destino disponibles para aplicar la tarjeta.",
            });
            return;
        }

        const masterUser = String(panelMaestro.usuario || "").trim();
        const masterPass = decryptPassword(String(panelMaestro.contrasena || ""), CONFIG.SECRET_CRYPTO);
        const { cardNo } = await captureCardFromPanel(
            String(panelMaestro.direccion_ip),
            masterUser,
            masterPass
        );

        const employeeNo = String(registro.id_empleado);
        const paneles_aplicados: string[] = [];
        const paneles_fallidos: Array<{ panel: string; mensaje: string; }> = [];

        for (const panel of panelesDestino) {
            const panelNombre = String(panel.nombre || panel.direccion_ip || panel._id);
            try {
                const panelUser = String(panel.usuario || "").trim();
                const panelPass = decryptPassword(String(panel.contrasena || ""), CONFIG.SECRET_CRYPTO);
                await setupCardOnPanel(
                    String(panel.direccion_ip),
                    panelUser,
                    panelPass,
                    employeeNo,
                    cardNo
                );
                paneles_aplicados.push(panelNombre);
            } catch (error: any) {
                paneles_fallidos.push({
                    panel: panelNombre,
                    mensaje: error?.message || "Error al aplicar tarjeta en panel.",
                });
            }
        }

        if (paneles_aplicados.length === 0) {
            res.status(200).json({
                estado: false,
                mensaje: "No se pudo aplicar la tarjeta en ningún panel.",
                datos: { paneles_fallidos },
            });
            return;
        }

        const nuevaTarjeta: TarjetaWeb = {
            id: `TW-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            nombre,
            descripcion,
            card_no: String(cardNo),
            fecha_creacion: new Date(),
        };
        const tarjetasWeb = [...tarjetasWebActual, nuevaTarjeta];
        const tarjetasRegistradas = Array.from(
            new Set([
                ...(Array.isArray(registro.tarjetas_registradas) ? registro.tarjetas_registradas : []),
                String(cardNo),
            ])
        );

        await Empleados.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    tarjetas_web: tarjetasWeb,
                    tarjetas_registradas: tarjetasRegistradas,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                },
            },
            { runValidators: true }
        );

        res.status(200).json({
            estado: true,
            mensaje: paneles_fallidos.length > 0
                ? `Tarjeta registrada. Aplicada en ${paneles_aplicados.length} panel(es) y con fallas en ${paneles_fallidos.length}.`
                : "Tarjeta registrada correctamente.",
            datos: {
                tarjetas_web: tarjetasWeb,
                tarjetas_registradas: tarjetasRegistradas,
                tarjetas_total: tarjetasRegistradas.length,
                paneles_aplicados,
                paneles_fallidos,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function eliminarTarjetaEmpleadoPanel(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, "id_empresa") as IUsuario;
        const tarjetaId = String(req.params.tarjetaId || "").trim();

        if (!tarjetaId) {
            res.status(400).json({ estado: false, mensaje: "Identificador de tarjeta inválido." });
            return;
        }

        const filtro: any = { _id: req.params.id };
        if (!isMaster) filtro.id_empresa = id_empresa;

        const registro = await Empleados.findOne(filtro);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const tarjetasWebActual = normalizeTarjetasWeb((registro as any)?.tarjetas_web);
        const tarjeta = tarjetasWebActual.find((item) => item.id === tarjetaId);
        if (!tarjeta) {
            res.status(200).json({ estado: false, mensaje: "Tarjeta no encontrada." });
            return;
        }

        const tarjetasWeb = tarjetasWebActual.filter((item) => item.id !== tarjetaId);
        const tarjetasRegistradas = tarjetasWeb.map((item) => item.card_no);

        await Empleados.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    tarjetas_web: tarjetasWeb,
                    tarjetas_registradas: tarjetasRegistradas,
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                },
            },
            { runValidators: true }
        );

        res.status(200).json({
            estado: true,
            mensaje: "Tarjeta eliminada correctamente.",
            datos: {
                tarjetas_web: tarjetasWeb,
                tarjetas_registradas: tarjetasRegistradas,
                tarjetas_total: tarjetasRegistradas.length,
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const normalizarCorreo = (correo?: string) => String(correo || "").trim().toLowerCase();

const bioMessage = (payload: any, fallback: string) =>
    String(payload?.Response?.message || payload?.message || fallback).trim();

const bioCode = (payload: any) => String(payload?.Response?.code || payload?.code || "").trim();
const isBiostarAdminUser = (user: any): boolean => {
    const userId = String(user?.user_id || user?.User?.user_id || "").trim().toLowerCase();
    const loginId = String(user?.login_id || user?.User?.login_id || "").trim().toLowerCase();
    const name = String(user?.name || user?.User?.name || "").trim().toLowerCase();
    return userId === "administrator" || loginId === "administrator" || name === "administrator";
};

const getBiostarConexionActiva = async (): Promise<any | null> => {
    const main = await DispositivosBiostar.findOne({ activo: true, es_main: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (main) return main;
    const global = await BiostarConexion.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (global) return global;
    return DispositivosBiostar.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildBiostarDraft = (u: any) => {
    const userId = String(u?.user_id || "").trim();
    const fullName = String(u?.name || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const nombre = String(parts[0] || "").trim();
    const apellido_pat = String(parts.slice(1).join(" ") || "Empleado").trim();
    const rawEmail = normalizarCorreo(u?.email || "");
    const correo = EMAIL_RE.test(rawEmail) ? rawEmail : (userId ? `${userId.toLowerCase()}@biostar.local` : "");
    return {
        biostar_user_id: userId,
        biostar_group_id: String(u?.user_group_id?.id || "").trim(),
        biostar_group_name: String(u?.user_group_id?.name || "").trim(),
        nombre,
        apellido_pat,
        apellido_mat: "",
        correo,
        telefono: String(u?.phone || "").trim(),
        movil: "",
        extension: "",
    };
};

const getDefaultCompanyScope = async (id_usuario: string) => {
    const usuario = await Usuarios.findById(id_usuario, "id_empresa") as IUsuario | null;
    const id_empresa = String((usuario as any)?.id_empresa || "").trim();
    if (!id_empresa) return null;
    const empresa = await Empresas.findById(id_empresa, "pisos accesos esRoot") as any;
    if (!empresa) return null;
    const id_piso = String((empresa?.pisos?.[0] || "")).trim();
    const id_acceso = String((empresa?.accesos?.[0] || "")).trim();
    return { id_empresa, id_piso, id_acceso, esRoot: !!empresa?.esRoot };
};

export async function previewSyncBiostar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const defaults = await getDefaultCompanyScope(String(id_usuario || ""));
        if (!defaults?.id_empresa || !defaults?.id_piso || !defaults?.id_acceso) {
            res.status(200).json({
                estado: false,
                mensaje: "Falta configuración base en RE (empresa/piso/acceso) para importar automáticamente.",
            });
            return;
        }
        const conexion = await getBiostarConexionActiva();
        if (!conexion) {
            res.status(200).json({ estado: false, mensaje: "No hay conexión activa de BioStar." });
            return;
        }

        const live = await biostarRequest(conexion, {
            method: "POST",
            url: "/api/v2/users/search?noblockui",
            data: { limit: 5000, offset: 0 },
        });
        if (!live.ok) {
            res.status(200).json({ estado: false, mensaje: bioMessage(live.data, "No se pudo consultar usuarios en BioStar.") });
            return;
        }
        const rows = (live.data?.UserCollection?.rows || []) as any[];
        const candidatos = rows.filter((u) => !isBiostarAdminUser(u));
        const biostarIds = candidatos.map((u) => String(u?.user_id || "").trim()).filter(Boolean);
        const existentes = await Empleados.find(
            { biostar_user_id: { $in: biostarIds } },
            "biostar_user_id correo"
        ).lean();
        const byBio = new Map<string, any>();
        for (const e of existentes) byBio.set(String((e as any)?.biostar_user_id || "").trim(), e);

        const listos: any[] = [];
        const pendientes: any[] = [];
        for (const u of candidatos) {
            const draft = buildBiostarDraft(u);
            if (!draft.biostar_user_id) continue;
            if (byBio.has(draft.biostar_user_id)) continue;

            const motivos: string[] = [];
            if (!draft.nombre) motivos.push("Sin nombre en BioStar");
            if (!draft.correo) motivos.push("Sin correo válido");

            // Evita choque de correo.
            if (draft.correo) {
                const dup = await Empleados.findOne({ correo: draft.correo }, "_id biostar_user_id").lean();
                if (dup && String((dup as any)?.biostar_user_id || "").trim() !== draft.biostar_user_id) {
                    motivos.push("Correo ya existe en RE");
                }
            }

            const payload = {
                ...draft,
                id_empresa: defaults.id_empresa,
                id_piso: defaults.id_piso,
                accesos: [defaults.id_acceso],
            };
            if (motivos.length === 0) listos.push(payload);
            else pendientes.push({ ...payload, motivos });
        }

        res.status(200).json({
            estado: true,
            datos: {
                listos,
                pendientes,
                resumen: { listos: listos.length, pendientes: pendientes.length },
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function importarSyncBiostar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const previewReq = { ...req } as Request;
        const capture: any = {};
        const fakeRes: any = {
            status: (_code: number) => ({
                json: (payload: any) => { capture.payload = payload; return payload; }
            })
        };
        await previewSyncBiostar(previewReq, fakeRes as Response);
        const data = capture?.payload;
        if (!data?.estado) {
            res.status(200).json(data || { estado: false, mensaje: "No se pudo preparar la sincronización." });
            return;
        }
        const listos = Array.isArray(data?.datos?.listos) ? data.datos.listos : [];
        let creados = 0;
        let omitidos = 0;
        for (const item of listos) {
            const exists = await Empleados.findOne({ biostar_user_id: item.biostar_user_id }, "_id").lean();
            if (exists) { omitidos++; continue; }
            const nuevo = new Empleados({
                img_usuario: "",
                nombre: item.nombre,
                apellido_pat: item.apellido_pat || "Empleado",
                apellido_mat: "",
                correo: item.correo,
                movil: item.movil || "",
                telefono: item.telefono || "",
                extension: item.extension || "",
                id_puesto: null,
                id_departamento: null,
                id_cubiculo: null,
                id_empresa: item.id_empresa,
                id_piso: item.id_piso,
                accesos: item.accesos,
                acceso_campo: false,
                biostar_user_id: item.biostar_user_id,
                biostar_group_id: item.biostar_group_id || "1",
                biostar_group_name: item.biostar_group_name || "All Users",
                sync_hikvision_pendiente: false,
                sync_biostar_pendiente: false,
                sync_hikvision_error: "",
                sync_biostar_error: "",
                creado_por: id_usuario,
                modificado_por: id_usuario,
                activo: true,
            });
            await nuevo.save();
            creados++;
        }
        res.status(200).json({
            estado: true,
            datos: {
                creados,
                omitidos,
                pendientes: Array.isArray(data?.datos?.pendientes) ? data.datos.pendientes : [],
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerResumenGruposBiostarRegistrados(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;

        const match: any = {
            activo: true,
            biostar_user_id: { $nin: ["", null] },
            biostar_group_id: { $nin: ["", null] },
        };
        if (!isMaster) match.id_empresa = new Types.ObjectId(id_empresa);

        let rows = await Empleados.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$biostar_group_id",
                    nombre: { $first: "$biostar_group_name" },
                    total: { $sum: 1 },
                }
            },
            {
                $project: {
                    _id: 0,
                    id_externo: "$_id",
                    nombre: {
                        $cond: [
                            { $or: [{ $eq: ["$nombre", ""] }, { $eq: ["$nombre", null] }] },
                            "Sin nombre",
                            "$nombre"
                        ]
                    },
                    total: 1,
                }
            },
            { $sort: { nombre: 1 } }
        ]);

        // Filtra y normaliza contra grupos vivos en BioStar para evitar mostrar grupos ya eliminados.
        const conexion = await getBiostarConexionActiva();
        if (conexion) {
            const liveRes = await biostarRequest(conexion, { method: "GET", url: "/api/user_groups?limit=1000" });
            const liveRows = (liveRes.data?.UserGroupCollection?.rows || []) as any[];
            const liveById = new Map<string, { id_externo: string; nombre: string }>();
            for (const g of liveRows) {
                const id = String(g?.id || "").trim();
                const nombre = String(g?.name || "").trim();
                if (!id) continue;
                liveById.set(id, { id_externo: id, nombre: nombre || "Sin nombre" });
            }

            rows = rows
                .filter((r: any) => liveById.has(String(r?.id_externo || "").trim()))
                .map((r: any) => {
                    const live = liveById.get(String(r?.id_externo || "").trim());
                    return {
                        ...r,
                        nombre: live?.nombre || r?.nombre || "Sin nombre",
                    };
                });

            const groupIds = Array.from(
                new Set(rows.map((r: any) => String(r?.id_externo || "").trim()).filter(Boolean))
            );
            if (groupIds.length > 0) {
                const usersRes = await biostarRequest(conexion, {
                    method: "POST",
                    url: "/api/v2/users/search?noblockui",
                    data: { limit: 5000, offset: 0, user_group_id_list: groupIds },
                });
                const users = (usersRes.data?.UserCollection?.rows || []) as any[];
                const adminsByGroup = new Map<string, number>();
                for (const u of users) {
                    if (!isBiostarAdminUser(u)) continue;
                    const gid = String(u?.user_group_id?.id || "").trim();
                    if (!gid) continue;
                    adminsByGroup.set(gid, (adminsByGroup.get(gid) || 0) + 1);
                }
                rows = rows
                    .map((r: any) => {
                        const gid = String(r?.id_externo || "").trim();
                        const total = Math.max(0, Number(r?.total || 0) - (adminsByGroup.get(gid) || 0));
                        return { ...r, total };
                    })
                    .filter((r: any) => Number(r?.total || 0) > 0);
            }
        }

        res.status(200).json({ estado: true, datos: rows });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const resolveBiostarGroup = async (conexion: any, idGrupo?: string) => {
    const allUsers = { id: "1", name: "All Users" };
    const target = String(idGrupo || "").trim();
    if (!target) return allUsers;
    const r = await biostarRequest(conexion, { method: "GET", url: "/api/user_groups?limit=1000" });
    const rows = (r.data?.UserGroupCollection?.rows || []) as any[];
    const found = rows.find((g) => String(g?.id) === target);
    if (!found) return null;
    return { id: String(found.id), name: String(found.name || "All Users") };
};

const cleanBase64Image = (img?: string) => String(img || "").replace(/^data:image\/\w+;base64,/, "").trim();

const syncEmpleadoBiostarPhoto = async ({
    conexion,
    userId,
    imgUsuario,
}: {
    conexion: any;
    userId: string;
    imgUsuario?: string;
}): Promise<{ ok: boolean; mensaje?: string }> => {
    const id = String(userId || "").trim();
    if (!id) return { ok: false, mensaje: "No se pudo sincronizar la imagen en BioStar: user_id vacio." };

    const hasImage = !!String(imgUsuario || "").trim();
    let photoBase64 = "";

    if (hasImage) {
        const jpgDataUrl = await resizeImage(String(imgUsuario), true, 300, "jpeg");
        photoBase64 = cleanBase64Image(jpgDataUrl);
        if (!photoBase64) {
            return { ok: false, mensaje: "No se pudo convertir la imagen para BioStar." };
        }

        // Validacion de formato como en el flujo oficial del HAR.
        const check = await biostarRequest(conexion, {
            method: "PUT",
            url: "/api/users/check/upload_picture",
            data: { template_ex_picture: photoBase64 },
            timeout: 20000,
        });
        const checkCode = bioCode(check.data);
        if (!(check.ok && (!checkCode || checkCode === "0"))) {
            const checkMsg = bioMessage(check.data, check.message || "BioStar rechazo la imagen.");
            return { ok: false, mensaje: checkCode ? `${checkMsg} (code ${checkCode})` : checkMsg };
        }
    }

    const photoPayloads = hasImage
        ? [
            // Perfil + credencial visual activados por defecto.
            {
                User: {
                    photo: photoBase64,
                    useProfile: "true",
                    credentials: {
                        visualFaces: [
                            {
                                flag: "1",
                                template_ex_normalized_image: photoBase64,
                            },
                        ],
                    },
                    check_visualFace_img_validation: true,
                },
            },
            {
                User: {
                    photo: photoBase64,
                    useProfile: "true",
                },
            },
            // Fallback de compatibilidad.
            {
                User: {
                    photo: photoBase64,
                },
            },
        ]
        : [
            // En BioStar, photo vacio elimina la foto actual del usuario.
            { User: { photo: "" } },
        ];

    let lastPhotoMsg = "No se pudo actualizar la imagen en BioStar.";
    for (const payload of photoPayloads) {
        const putPhoto = await biostarRequest(conexion, {
            method: "PUT",
            url: `/api/users/${encodeURIComponent(id)}`,
            data: payload,
            timeout: 20000,
        });
        const photoCode = bioCode(putPhoto.data);
        if (putPhoto.ok && (!photoCode || photoCode === "0")) {
            return { ok: true };
        }
        const msg = bioMessage(putPhoto.data, putPhoto.message || lastPhotoMsg);
        lastPhotoMsg = photoCode ? `${msg} (code ${photoCode})` : msg;
    }

    return { ok: false, mensaje: lastPhotoMsg };
};

const syncEmpleadoBiostar = async ({
    empleado,
    biostar_group_id,
    disabled,
}: {
    empleado: IEmpleado;
    biostar_group_id?: string;
    disabled?: boolean;
}): Promise<{ ok: boolean; mensaje?: string; userId?: string; groupId?: string; groupName?: string }> => {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) return { ok: false, mensaje: "Primero configura la conexion global de BioStar." };

    const grupo = await resolveBiostarGroup(conexion, biostar_group_id || (empleado as any)?.biostar_group_id || "1");
    if (!grupo) return { ok: false, mensaje: "El grupo de BioStar seleccionado no existe." };

    const MAX_USER_ID_NUM = 4294967295;
    const makeUserId = () => {
        const base = Date.now() % MAX_USER_ID_NUM;
        return String(base < 1 ? 1 : base);
    };
    let userId = String((empleado as any)?.biostar_user_id || empleado.id_empleado || "").trim();
    if (!userId || /\s/.test(userId)) userId = makeUserId();
    const now = new Date();
    const farFuture = new Date(now);
    farFuture.setFullYear(farFuture.getFullYear() + 30);
    const toBioIso = (d: Date, endOfDay = false) => {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const hh = endOfDay ? "23" : "00";
        const min = endOfDay ? "59" : "00";
        return `${yyyy}-${mm}-${dd}T${hh}:${min}:00.00Z`;
    };

    const exists = userId
        ? await biostarRequest(conexion, { method: "GET", url: `/api/users/${encodeURIComponent(userId)}` })
        : { ok: false, data: null } as any;
    const isEdit = !!(exists.ok && exists.data?.User);
    const hadBiostarUserId = !!String((empleado as any)?.biostar_user_id || "").trim();
    const biostarIdNotFound = !isEdit && hadBiostarUserId;
    // Si RE tiene biostar_user_id pero BioStar ya no lo encuentra, no reusar ese id huérfano.
    if (!isEdit && (!hadBiostarUserId || biostarIdNotFound)) {
        const nextIdRes = await biostarRequest(conexion, { method: "GET", url: "/api/users/next_user_id" });
        const nextRaw =
            nextIdRes.data?.User?.user_id ??
            nextIdRes.data?.user_id ??
            nextIdRes.data?.next_user_id ??
            nextIdRes.data?.UserID ??
            "";
        const nextId = String(nextRaw || "").trim();
        if (nextId && !/\s/.test(nextId)) {
            userId = nextId;
        }
    }
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/users/${encodeURIComponent(userId)}` : "/api/users";

    let nombreDepartamento = "departamento";
    let nombrePuesto = "empleado";
    const idDepto = String((empleado as any)?.id_departamento || "").trim();
    const idPuesto = String((empleado as any)?.id_puesto || "").trim();
    if (idDepto) {
        const dep = await Departamentos.findById(idDepto, "nombre").lean();
        if (dep?.nombre) nombreDepartamento = String(dep.nombre).trim();
    }
    if (idPuesto) {
        const pu = await Puestos.findById(idPuesto, "nombre").lean();
        if (pu?.nombre) nombrePuesto = String(pu.nombre).trim();
    }

    const payloads = [
        {
            User: {
                user_id: userId,
                name: String([empleado.nombre, empleado.apellido_pat, empleado.apellido_mat].filter(Boolean).join(" ").trim() || userId),
                email: normalizarCorreo(empleado.correo),
                phone: String(empleado.telefono || empleado.movil || "").trim(),
                user_group_id: { id: Number(grupo.id) || grupo.id, name: grupo.name },
                disabled: disabled ? "true" : "false",
                start_datetime: "2001-01-01T00:00:00.00Z",
                expiry_datetime: "2037-12-31T23:59:00.00Z",
                department: nombreDepartamento,
                user_title: nombrePuesto,
            },
        },
        {
            User: {
                user_id: userId,
                name: String([empleado.nombre, empleado.apellido_pat, empleado.apellido_mat].filter(Boolean).join(" ").trim() || userId),
                email: normalizarCorreo(empleado.correo),
                phone: String(empleado.telefono || empleado.movil || "").trim(),
                user_group_id: { id: Number(grupo.id) || grupo.id },
                disabled: disabled ? "true" : "false",
                start_datetime: "2001-01-01T00:00:00.00Z",
                expiry_datetime: "2037-12-31T23:59:00.00Z",
                department: nombreDepartamento,
                user_title: nombrePuesto,
            },
        },
        {
            User: {
                user_id: userId,
                name: String([empleado.nombre, empleado.apellido_pat, empleado.apellido_mat].filter(Boolean).join(" ").trim() || userId),
                email: normalizarCorreo(empleado.correo),
                phone: String(empleado.telefono || empleado.movil || "").trim(),
                user_group_id: Number(grupo.id) || grupo.id,
                disabled: disabled ? "true" : "false",
                start_datetime: "2001-01-01T00:00:00.00Z",
                expiry_datetime: "2037-12-31T23:59:00.00Z",
                department: nombreDepartamento,
                user_title: nombrePuesto,
            },
        },
        {
            User: {
                user_id: userId,
                name: String([empleado.nombre, empleado.apellido_pat, empleado.apellido_mat].filter(Boolean).join(" ").trim() || userId),
                email: normalizarCorreo(empleado.correo),
                phone: String(empleado.telefono || empleado.movil || "").trim(),
                user_group_id: { id: Number(grupo.id) || grupo.id, name: grupo.name },
                disabled: disabled ? "true" : "false",
                start_datetime: "2001-01-01T00:00:00.00Z",
                expiry_datetime: "2037-12-31T23:59:00.00Z",
                department: nombreDepartamento,
                user_title: nombrePuesto,
            },
        },
    ];

    let lastMsg = "No se pudo sincronizar el empleado en BioStar.";
    for (const body of payloads) {
        const upsert = await biostarRequest(conexion, { method, url, data: body });
        const code = bioCode(upsert.data);
        if (upsert.ok && (!code || code === "0")) {
            const photoRes = await syncEmpleadoBiostarPhoto({
                conexion,
                userId,
                imgUsuario: (empleado as any)?.img_usuario || "",
            });
            if (!photoRes.ok) {
                return { ok: false, mensaje: photoRes.mensaje || "No se pudo sincronizar la imagen en BioStar." };
            }
            return { ok: true, userId, groupId: grupo.id, groupName: grupo.name };
        }
        const msg = bioMessage(upsert.data, upsert.message || lastMsg);
        lastMsg = code ? `${msg} (code ${code})` : msg;
    }
    if (!isEdit && lastMsg.toLowerCase().includes("code 800")) {
        for (let i = 0; i < 3; i++) {
            const altUserId = makeUserId();
            const altPayload = {
                User: {
                    user_id: altUserId,
                    name: String([empleado.nombre, empleado.apellido_pat, empleado.apellido_mat].filter(Boolean).join(" ").trim() || altUserId),
                    email: normalizarCorreo(empleado.correo),
                    phone: String(empleado.telefono || empleado.movil || "").trim(),
                    user_group_id: { id: Number(grupo.id) || grupo.id, name: grupo.name },
                    disabled: disabled ? "true" : "false",
                    start_datetime: "2001-01-01T00:00:00.00Z",
                    expiry_datetime: "2037-12-31T23:59:00.00Z",
                    department: nombreDepartamento,
                    user_title: nombrePuesto,
                },
            };
            const retry = await biostarRequest(conexion, { method: "POST", url: "/api/users", data: altPayload });
            const retryCode = bioCode(retry.data);
            if (retry.ok && (!retryCode || retryCode === "0")) {
                const photoRes = await syncEmpleadoBiostarPhoto({
                    conexion,
                    userId: altUserId,
                    imgUsuario: (empleado as any)?.img_usuario || "",
                });
                if (!photoRes.ok) {
                    return { ok: false, mensaje: photoRes.mensaje || "No se pudo sincronizar la imagen en BioStar." };
                }
                return { ok: true, userId: altUserId, groupId: grupo.id, groupName: grupo.name };
            }
            const retryMsg = bioMessage(retry.data, retry.message || lastMsg);
            lastMsg = retryCode ? `${retryMsg} (code ${retryCode})` : retryMsg;
        }
    }
    return { ok: false, mensaje: lastMsg };
};

const deleteEmpleadoBiostar = async (userId?: string): Promise<{ ok: boolean; mensaje?: string }> => {
    const id = String(userId || "").trim();
    if (!id) return { ok: true };
    const conexion = await getBiostarConexionActiva();
    if (!conexion) return { ok: true };
    const del = await biostarRequest(conexion, { method: "DELETE", url: `/api/users/${encodeURIComponent(id)}` });
    if (del.ok || String(del.data?.Response?.code || "") === "0") return { ok: true };
    return { ok: false, mensaje: bioMessage(del.data, del.message || "No se pudo eliminar el empleado en BioStar.") };
};

const sincronizarUsuarioCampo = async ({
    empleado,
    accesoCampo,
    idUsuarioModif,
}: {
    empleado: IEmpleado;
    accesoCampo: boolean;
    idUsuarioModif: string | Types.ObjectId;
}) => {
    const correo = normalizarCorreo(empleado.correo);
    if (!correo) {
        return;
    }

    const nombreCompleto = [empleado.nombre, empleado.apellido_pat, empleado.apellido_mat]
        .filter(Boolean)
        .join(" ");

    const usuarioExistente = await Usuarios.findOne({ correo });
    if (accesoCampo) {
        if (!usuarioExistente) {
            const contrasena = generarCodigoUnico(12, true);
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                throw new Error("Hubo un error al generar la contraseña para el usuario de campo.");
            }
            const nuevoUsuario = new Usuarios({
                nombre: empleado.nombre,
                apellido_pat: empleado.apellido_pat,
                apellido_mat: empleado.apellido_mat,
                correo,
                contrasena: hash,
                rol: [12],
                telefono: empleado.telefono || "",
                movil: empleado.movil || "",
                extension: empleado.extension || "",
                id_empresa: empleado.id_empresa,
                id_piso: empleado.id_piso,
                accesos: empleado.accesos || [],
                esRoot: !!empleado.esRoot,
                creado_por: idUsuarioModif,
                activo: true,
            });
            await nuevoUsuario.save();
            const roles = await Roles.find({ rol: { $in: [12] }, activo: true }, "nombre").lean();
            const rolesString = roles.map((item) => item.nombre).join(" - ");
            await enviarCorreoUsuario(correo, contrasena, rolesString, nombreCompleto);
            await Empleados.findByIdAndUpdate(empleado._id, { $set: { usuario_campo_activo: true } });
            return;
        }

        const rolActual = Array.isArray(usuarioExistente.rol) ? usuarioExistente.rol : [];
        const nuevoRol = rolActual.includes(12) ? rolActual : [...rolActual, 12];
        await Usuarios.findByIdAndUpdate(usuarioExistente._id, {
            $set: {
                nombre: empleado.nombre,
                apellido_pat: empleado.apellido_pat,
                apellido_mat: empleado.apellido_mat || "",
                telefono: empleado.telefono || "",
                movil: empleado.movil || "",
                extension: empleado.extension || "",
                id_empresa: empleado.id_empresa,
                id_piso: empleado.id_piso,
                accesos: empleado.accesos || [],
                rol: nuevoRol,
                activo: true,
                fecha_modificacion: Date.now(),
                modificado_por: idUsuarioModif,
            },
        });
        await Empleados.findByIdAndUpdate(empleado._id, { $set: { usuario_campo_activo: true } });
        return;
    }

    if (!usuarioExistente) {
        await Empleados.findByIdAndUpdate(empleado._id, { $set: { usuario_campo_activo: false } });
        return;
    }

    const rolesActuales = Array.isArray(usuarioExistente.rol) ? usuarioExistente.rol : [];
    const rolesSinCampo = rolesActuales.filter((item) => item !== 12);
    const sinMasRoles = rolesSinCampo.length === 0;
    await Usuarios.findByIdAndUpdate(usuarioExistente._id, {
        $set: {
            rol: sinMasRoles ? [12] : rolesSinCampo,
            activo: sinMasRoles ? false : !!usuarioExistente.activo,
            token_web: "",
            token_app: "",
            fecha_modificacion: Date.now(),
            modificado_por: idUsuarioModif,
        },
    });
    await Empleados.findByIdAndUpdate(empleado._id, { $set: { usuario_campo_activo: false } });
};

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, id_empresa, id_piso, accesos, id_puesto, id_departamento, id_cubiculo, movil, telefono, extension, correo, acceso_campo, biostar_group_id } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const empresa = await Empresas.findById(id_empresa, 'pisos accesos esRoot activo');

        const nuevoUsuario = new Empleados({
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
            acceso_campo: !!acceso_campo,
            esRoot: empresa?.esRoot,
            creado_por: id_usuario
        });
        const mensajes = await validarModelo(nuevoUsuario as any);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        await nuevoUsuario
            .save()
            .then(async (reg_saved) => {
                const { habilitarIntegracionHv, habilitarIntegracionBiostar } = await Configuracion.findOne({}, "habilitarIntegracionHv habilitarIntegracionBiostar") as IConfiguracion;
                let hikvisionPendiente = false;
                let biostarPendiente = false;
                let hikvisionError = "";
                let biostarError = "";

                if (habilitarIntegracionHv) {
                    const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: accesos } });
                    for await (let panel of paneles) {
                        try {
                            const { direccion_ip, usuario, contrasena } = panel;
                            const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                            const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                            const syncRes = await HVPANEL.saverUser(mapEmpleadoToPanel(reg_saved));
                            console.log("[EMP] Panel sync respuesta (crear):", syncRes);
                            if (syncRes?.estado === false) {
                                hikvisionPendiente = true;
                                hikvisionError = syncRes?.mensaje || "No se pudo sincronizar en Hikvision.";
                            }
                        } catch (error: any) {
                            hikvisionPendiente = true;
                            hikvisionError = error?.response?.data?.mensaje || error?.message || "Error al sincronizar con el panel.";
                        }
                    }
                }
                if (habilitarIntegracionBiostar) {
                    const bioRes = await syncEmpleadoBiostar({
                        empleado: reg_saved as IEmpleado,
                        biostar_group_id: String(biostar_group_id || "").trim() || "1",
                        disabled: false,
                    });
                    if (!bioRes.ok) {
                        biostarPendiente = true;
                        biostarError = bioRes.mensaje || "No se pudo sincronizar el empleado en BioStar.";
                    } else {
                        await Empleados.findByIdAndUpdate(reg_saved._id, {
                            $set: {
                                biostar_user_id: bioRes.userId || "",
                                biostar_group_id: bioRes.groupId || "",
                                biostar_group_name: bioRes.groupName || "",
                            }
                        });
                    }
                }

                await Empleados.findByIdAndUpdate(reg_saved._id, {
                    $set: {
                        sync_hikvision_pendiente: hikvisionPendiente,
                        sync_biostar_pendiente: biostarPendiente,
                        sync_hikvision_error: hikvisionError,
                        sync_biostar_error: biostarError,
                    },
                });

                const pendientes = [
                    ...(hikvisionPendiente ? ["hikvision"] : []),
                    ...(biostarPendiente ? ["biostar"] : []),
                ];
                await sincronizarUsuarioCampo({
                    empleado: reg_saved,
                    accesoCampo: !!acceso_campo,
                    idUsuarioModif: id_usuario,
                });
                res.status(200).json({
                    estado: true,
                    datos: { usuario: true },
                    sync: {
                        pendiente: pendientes,
                        hikvision_error: hikvisionError || "",
                        biostar_error: biostarError || "",
                    },
                });
                setTimeout(() => {
                    (async () => {
                        if (img_usuario) {
                            try {
                                // TEMP: permitir imágenes sin rostro en catálogo de empleados.
                                await faceDetector.guardarDescriptorUsuario({ id_usu_modif: id_usuario, id_usuario: reg_saved._id, img_usuario: reg_saved.img_usuario });
                            } catch {
                                await faceDetector.deshabilitarDescriptor({ id_usu_modif: id_usuario, id_usuario: reg_saved._id });
                            }
                        } else {
                            await faceDetector.deshabilitarDescriptor({ id_usu_modif: id_usuario, id_usuario: reg_saved._id });
                        }
                    })();
                }, 0);
                return;
            })
            .catch(async (error) => {
                log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
            });
    } catch (error: any) {
        console.log(error);
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};
export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, id_empresa, id_piso, accesos, id_puesto, id_departamento, id_cubiculo, movil, telefono, extension, correo, acceso_campo, biostar_group_id } = req.body;
        const id_usuario = (req as UserRequest).userId;
        const empresa = await Empresas.findById(id_empresa, 'esRoot');

        const esUsuarioMaestro = await Empleados.find({ _id: req.params.id, esRoot: true, id_empleado: 1 }, '_id').limit(1);
        const prevRegistro = await Empleados.findById(req.params.id).lean() as IEmpleado | null;
        const imgChanged = prevRegistro ? prevRegistro.img_usuario !== img_usuario : true;
        let updateData = {
            img_usuario: imgChanged ? await resizeImage(img_usuario) : prevRegistro?.img_usuario || '',
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
            acceso_campo: !!acceso_campo,
            biostar_group_id: String(biostar_group_id || prevRegistro?.biostar_group_id || "").trim(),
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
        };
        if (!esUsuarioMaestro[0]) {
            Object.assign(updateData, {
                id_empresa,
                id_piso,
                correo,
                esRoot: empresa?.esRoot,
            });
        }
        const registro = await Empleados.findByIdAndUpdate(
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

        if (!registro || !prevRegistro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado' });
            return;
        }

        const panelPayload = mapEmpleadoToPanel(registro);
        if (imgChanged && prevRegistro?.img_usuario) {
            (panelPayload as any).img_usuario_prev = prevRegistro.img_usuario;
        }
        if (!imgChanged) {
            delete (panelPayload as any).img_usuario;
        }

        const { habilitarIntegracionHv, habilitarIntegracionBiostar } = await Configuracion.findOne({}, 'habilitarIntegracionHv habilitarIntegracionBiostar') as IConfiguracion;
        let hikvisionPendiente = false;
        let biostarPendiente = false;
        let hikvisionError = "";
        let biostarError = "";

        if (habilitarIntegracionHv) {
            const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: accesos } });
            for await (let panel of paneles) {
                try {
                    const { direccion_ip, usuario, contrasena } = panel;
                    const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                    const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                    const syncRes = await HVPANEL.saverUser(panelPayload);
                    console.log("[EMP] Panel sync respuesta (modificar):", syncRes);
                    if (syncRes?.estado === false) {
                        hikvisionPendiente = true;
                        hikvisionError = syncRes?.mensaje || "No se pudo sincronizar en Hikvision.";
                    }
                } catch (error: any) {
                    hikvisionPendiente = true;
                    hikvisionError = error?.response?.data?.mensaje || error?.message || "Error al sincronizar con el panel.";
                }
            }
        }

        if (habilitarIntegracionBiostar) {
            const bioRes = await syncEmpleadoBiostar({
                empleado: registro as IEmpleado,
                biostar_group_id: String(biostar_group_id || (prevRegistro as any)?.biostar_group_id || "1"),
                disabled: false,
            });
            if (!bioRes.ok) {
                biostarPendiente = true;
                biostarError = bioRes.mensaje || "No se pudo sincronizar el empleado en BioStar.";
            } else {
                await Empleados.findByIdAndUpdate(req.params.id, {
                    $set: {
                        biostar_user_id: bioRes.userId || (prevRegistro as any)?.biostar_user_id || "",
                        biostar_group_id: bioRes.groupId || "",
                        biostar_group_name: bioRes.groupName || "",
                    }
                });
            }
        }

        await Empleados.findByIdAndUpdate(req.params.id, {
            $set: {
                sync_hikvision_pendiente: hikvisionPendiente,
                sync_biostar_pendiente: biostarPendiente,
                sync_hikvision_error: hikvisionError,
                sync_biostar_error: biostarError,
            },
        });

        const pendientes = [
            ...(hikvisionPendiente ? ["hikvision"] : []),
            ...(biostarPendiente ? ["biostar"] : []),
        ];
        await sincronizarUsuarioCampo({
            empleado: registro as IEmpleado,
            accesoCampo: !!acceso_campo,
            idUsuarioModif: id_usuario,
        });
        res.status(200).json({
            estado: true,
            sync: {
                pendiente: pendientes,
                hikvision_error: hikvisionError || "",
                biostar_error: biostarError || "",
            },
        });
        setTimeout(() => {
            (async () => {
                if (imgChanged) {
                    if (registro.img_usuario) {
                        try {
                            await faceDetector.guardarDescriptorUsuario({
                                id_usu_modif: id_usuario,
                                id_usuario: registro._id,
                                img_usuario: registro.img_usuario,
                            });
                        } catch {
                            await faceDetector.deshabilitarDescriptor({
                                id_usu_modif: id_usuario,
                                id_usuario: registro._id,
                            });
                        }
                    } else {
                        await faceDetector.deshabilitarDescriptor({
                            id_usu_modif: id_usuario,
                            id_usuario: registro._id,
                        });
                    }
                }
            })();
        }, 0);
        return;
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function reintentarSync(req: Request, res: Response): Promise<void> {
    try {
        const id = String(req.params.id || "").trim();
        if (!id) {
            res.status(200).json({ estado: false, mensaje: "Id de empleado invalido." });
            return;
        }
        const registro = await Empleados.findById(id);
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Empleado no encontrado." });
            return;
        }

        const { habilitarIntegracionHv, habilitarIntegracionBiostar } = await Configuracion.findOne({}, "habilitarIntegracionHv habilitarIntegracionBiostar") as IConfiguracion;

        let hikvisionPendiente = !!(registro as any)?.sync_hikvision_pendiente;
        let biostarPendiente = !!(registro as any)?.sync_biostar_pendiente;
        let hikvisionError = String((registro as any)?.sync_hikvision_error || "");
        let biostarError = String((registro as any)?.sync_biostar_error || "");

        if (habilitarIntegracionHv && hikvisionPendiente) {
            hikvisionPendiente = false;
            hikvisionError = "";
            const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: registro.accesos || [] } });
            const panelPayload = mapEmpleadoToPanel(registro as IEmpleado);
            for await (let panel of paneles) {
                try {
                    const { direccion_ip, usuario, contrasena } = panel;
                    const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                    const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                    const syncRes = await HVPANEL.saverUser(panelPayload);
                    if (syncRes?.estado === false) {
                        hikvisionPendiente = true;
                        hikvisionError = syncRes?.mensaje || "No se pudo sincronizar en Hikvision.";
                    }
                } catch (error: any) {
                    hikvisionPendiente = true;
                    hikvisionError = error?.response?.data?.mensaje || error?.message || "Error al sincronizar con el panel.";
                }
            }
        }

        if (habilitarIntegracionBiostar && biostarPendiente) {
            const bioRes = await syncEmpleadoBiostar({
                empleado: registro as IEmpleado,
                biostar_group_id: String((registro as any)?.biostar_group_id || "1"),
                disabled: !registro.activo,
            });
            if (!bioRes.ok) {
                biostarPendiente = true;
                biostarError = bioRes.mensaje || "No se pudo sincronizar el empleado en BioStar.";
            } else {
                biostarPendiente = false;
                biostarError = "";
                await Empleados.findByIdAndUpdate(id, {
                    $set: {
                        biostar_user_id: bioRes.userId || (registro as any)?.biostar_user_id || "",
                        biostar_group_id: bioRes.groupId || (registro as any)?.biostar_group_id || "",
                        biostar_group_name: bioRes.groupName || (registro as any)?.biostar_group_name || "",
                    },
                });
            }
        }

        await Empleados.findByIdAndUpdate(id, {
            $set: {
                sync_hikvision_pendiente: hikvisionPendiente,
                sync_biostar_pendiente: biostarPendiente,
                sync_hikvision_error: hikvisionError,
                sync_biostar_error: biostarError,
            },
        });

        const pendientes = [
            ...(hikvisionPendiente ? ["hikvision"] : []),
            ...(biostarPendiente ? ["biostar"] : []),
        ];
        res.status(200).json({
            estado: true,
            sync: {
                pendiente: pendientes,
                hikvision_error: hikvisionError || "",
                biostar_error: biostarError || "",
            },
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const { activo } = req.body;
        const validar_registro = await Empleados.findOne({ _id: req.params.id, id_empleado: 1 });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'No puede eliminar al usuario maestro.' });
            return;
        }
        const registro = await Empleados.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        // Cambio de estado solo en RE (no borrar ni sincronizar en BioStar/Hikvision).
        await FaceDescriptors.updateOne({ id_usuario: req.params.id }, { $set: { activo: !activo } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function anonimizar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const validar_registro = await Empleados.findById(req.params.id, 'correo activo');

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

        await Empleados.findByIdAndUpdate(req.params.id, { $set: { img_usuario: '', apellido_pat: "", apellido_mat: "", correo: correo_arco, telefono: "", movil: "", extension: "", modificado_por: id_usuario, fecha_modificacion: Date.now(), arco: true } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function desbloquear(req: Request, res: Response): Promise<void> {
    try {
        const validar_registro = await Empleados.findByIdAndUpdate(req.params.id, { $set: { token_bloqueo: '', intentos: 5 } });
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
        const usuario = await Empleados.findById(req.params.id, 'id_empleado');
        if (!usuario) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        QRCode.toDataURL(String(usuario.id_empleado), {
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

export async function cargarProgramacionEmpleados(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { registros: datos, envioCorreos } = req.body;

        let detectoErrores = false;
        const registros: any[] = [];
        for await (const registro of datos) {
            const nuevoEmpleado = new Empleados({ ...registro });
            const mensajes = await validarModelo(nuevoEmpleado as any);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...registro, errores: { ...mensajes } });
                continue;
            }
            registros.push({ ...registro });
        }
        const arrDuplicados = marcarDuplicados(registros);
        detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: registros });
            return;
        }

        let correosEnviados = 0;
        let empleadosCreados = 0;
        let registrosGuardados = [];
        for await (const registro of registros) {
            const { id_empresa } = registro;
            const { esRoot } = await Empresas.findById(id_empresa, 'esRoot') as IEmpresa;

            const nuevoEmpleado = new Empleados({ ...registro, esRoot: !!esRoot, creado_por: id_usuario });
            await nuevoEmpleado.save();

            empleadosCreados++;
            registrosGuardados.push({ ...registro, envioHabilitado: envioCorreos, correoEnviado: false });
        }
        res.status(200).send({ estado: true, datos: { registros: registrosGuardados, empleados: empleadosCreados, correos: correosEnviados } });
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
                    const keys = Array.isArray(firstRow.values) ? firstRow.values.map((item) => String(item)) : [];
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
                        if (!data.nombre && !data.rfc && !data.id_piso && !data.accesos && !data.correo) return;
                        datos.push(data);
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
            const nuevoUsuario = new Empleados({ ...usuario });
            const mensajes = await validarModelo(nuevoUsuario as any);
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
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function descargarFormato(req: Request, res: Response): Promise<void> {
    fs.unlink('./temp/formatoEmpleados.xlsx', function (err) {
        if (err) {
            crearExcel(req, res);
        } else {
            crearExcel(req, res);
        }
    });
};

export async function crearExcel(req: Request, res: Response): Promise<void> {
    const id_usuario = (req as UserRequest).userId;
    const isMaster = (req as UserRequest).isMaster;
    const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario;
    const options = {
        root: './'
    };
    try {
        fs.access('./temp/formatoEmpleados.xlsx', async (error: any) => {
            if (error) {
                const workbook = new Excel.Workbook();
                // Hoja 1 - General 
                const worksheet = workbook.addWorksheet('General');
                const Columns = [] as Column[];
                const headersValues = HEADERS;
                headersValues.map(header => {
                    Columns.push({ header: header, key: header, width: 40 } as Column);
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

                await worksheet.protect(CONFIG.SECRET_EXCELJS, {});
                await workbook
                    .xlsx
                    .writeFile('./temp/formatoEmpleados.xlsx')
                    .then(async () => {
                        rellenarHojaEmpresasFormato({ isMaster, id_empresa }).then(async () => {
                            await res.sendFile('./temp/formatoEmpleados.xlsx', options);
                        });
                    })
                    .catch((error: any) => {
                        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
                    });

            } else {
                rellenarHojaEmpresasFormato({ isMaster, id_empresa })
                    .then(async () => {
                        await res.sendFile('./temp/formatoEmpleados.xlsx', options);
                    })
                    .catch((sendErr: any) => {
                        log(`${fecha()} ERROR: ${sendErr.name}: ${sendErr.message}\n`);
                        res.status(500).send({ estado: false, mensaje: `${sendErr.name}: ${sendErr.message}` });
                    });
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const rellenarHojaEmpresasFormato = async ({ isMaster, id_empresa }: { isMaster: boolean; id_empresa: Types.ObjectId; }) => {
    const nameFileExcel = './temp/formatoEmpleados.xlsx';
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
}



































