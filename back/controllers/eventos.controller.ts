import { Request, Response } from "express";
import { PipelineStage, Types } from 'mongoose';
import Configuracion, { IConfiguracion } from "../models/Configuracion";
import Horarios, { IHorario } from "../models/Horarios";
import DispositivosHv from "../models/DispositivosHv";
import Eventos, { IEvento } from "../models/Eventos";
import Usuarios, { IUsuario } from "../models/Usuarios";
import Empleados from "../models/Empleados";
import Registros, { IRegistro } from "../models/Registros";
import Empresas from "../models/Empresas";
import Visitantes from "../models/Visitantes";
import { fecha, log } from "../middlewares/log";
import {
    validacionRegistroActivo,
    guardarEventoNoValido,
    validacionHorario,
    customAggregationForDataGrids,
    cambiarEventoRegistro,
    obtenerUltimoEvento,
    resizeImage,
} from "../utils/utils";

import { UserRequest } from "../types/express";
import dayjs, { Dayjs, ManipulateType } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { enviarCorreoNotificarCheck } from "../utils/correos";
import { QueryParams } from "../types/queryparams";
import { REGEX_BASE64 } from "../utils/commonRegex";
import { socket } from '../utils/socketClient';
import FaceDetector from "../classes/FaceDetector";
import FaceDescriptors from "../models/FaceDescriptors";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function obtenerTodosPorFiltro(req: Request, res: Response): Promise<void> {
    try {
        const { usuarios, dispositivos, estatus, empresas, fecha_inicio, fecha_final } = req.body.datos;
        const entradaDay = dayjs(fecha_inicio);
        const salidaDay = dayjs(fecha_final);
        if (!entradaDay.isValid() || !salidaDay.isValid()) {
            res.status(200).json({ estado: false, mensaje: "Rango de fechas invalido." });
            return;
        }
        if (entradaDay.isAfter(salidaDay)) {
            res.status(200).json({ estado: false, mensaje: "La fecha de inicio no puede ser mayor que la fecha final." });
            return;
        }
        const entrada = entradaDay.toDate();
        const salida = salidaDay.toDate();
        const usuariosSeleccionados: Types.ObjectId[] = Array.isArray(usuarios)
            ? usuarios.map((item: string) => new Types.ObjectId(item))
            : [];
        const empleadosSeleccionados = usuariosSeleccionados.length
            ? await Empleados.find(
                { _id: { $in: usuariosSeleccionados } },
                { id_empleado: 1 }
            ).lean()
            : [];
        const qrsEmpleadosSeleccionados = empleadosSeleccionados
            .map((item: any) => String(item.id_empleado))
            .filter((item: string) => item !== "undefined" && item !== "null");
        const { filter, pagination, sort, panel } = req.query as { filter: string; pagination: string; sort: string; panel?: string; };
        const queryPanel = panel && panel !== "all" ? String(panel) : "";
        if (queryPanel && !Types.ObjectId.isValid(queryPanel)) {
            res.status(200).json({ estado: false, mensaje: "Panel de busqueda invalido." });
            return;
        }
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
            ["fecha_creacion", "usuario", "tipo_dispositivo", "tipo_check", "horario", "ubicacion"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        usuariosSeleccionados.length
                            ? {
                                $or: [
                                    { id_empleado: { $in: usuariosSeleccionados } },
                                    { id_usuario: { $in: usuariosSeleccionados } },
                                    { qr: { $in: qrsEmpleadosSeleccionados } },
                                ]
                            }
                            : {},
                        dispositivos?.length ? { tipo_dispositivo: { $in: dispositivos.map((item: number) => Number(item)) } } : {},
                        estatus?.length ? { tipo_check: { $in: estatus.filter((item: string | number) => [5, 6, 7].includes(Number(item))).map((item: number) => Number(item)) } } : {},
                        queryPanel ? { id_panel: new Types.ObjectId(queryPanel) } : {},
                        fecha_inicio && fecha_final
                            ? { fecha_creacion: { $gte: entrada, $lte: salida } }
                            : {},
                    ],
                },
            },
            {
                $set: {
                    id_empleado_effective: { $ifNull: ["$id_empleado", "$id_usuario"] }
                }
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "creado_por",
                    foreignField: "_id",
                    as: "creado_por",
                    pipeline: [
                        {
                            $project: {
                                id_empresa: 1,
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
                    from: "empleados",
                    localField: "id_empleado_effective",
                    foreignField: "_id",
                    as: "usuario",
                    pipeline: [
                        {
                            $project: {
                                id_empresa: 1,
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
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuario_sistema",
                    pipeline: [
                        {
                            $project: {
                                id_empresa: 1,
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
                    from: "empleados",
                    let: {
                        qrNumerico: {
                            $convert: {
                                input: "$qr",
                                to: "int",
                                onError: null,
                                onNull: null
                            }
                        }
                    },
                    as: "usuario_por_qr",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$id_empleado", "$$qrNumerico"]
                                }
                            }
                        },
                        {
                            $project: {
                                id_empresa: 1,
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
                    from: "visitantes",
                    localField: "id_visitante",
                    foreignField: "_id",
                    as: "visitante",
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
                $set: {
                    creado_por: { $arrayElemAt: ["$creado_por", -1] },
                    usuario: { $arrayElemAt: ["$usuario", -1] },
                    usuario_sistema: { $arrayElemAt: ["$usuario_sistema", -1] },
                    usuario_por_qr: { $arrayElemAt: ["$usuario_por_qr", -1] },
                    visitante: { $arrayElemAt: ["$visitante", -1] },
                },
            },
            {
                $set: {
                    id_empresa: {
                        $cond: [
                            { $ifNull: ["$usuario", false] },
                            "$usuario.id_empresa",
                            {
                                $cond: [
                                    { $ifNull: ["$usuario_por_qr", false] },
                                    "$usuario_por_qr.id_empresa",
                                    {
                                        $cond: [
                                            { $ifNull: ["$usuario_sistema", false] },
                                            "$usuario_sistema.id_empresa",
                                            "$creado_por.id_empresa"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    estatus: "$tipo_check",
                    creado_por: "$creado_por.nombre",
                    usuario: {
                        $cond: [
                            { $ifNull: ["$usuario", false] },
                            "$usuario.nombre",
                            {
                                $cond: [
                                    { $ifNull: ["$usuario_por_qr", false] },
                                    "$usuario_por_qr.nombre",
                                    {
                                        $cond: [
                                            { $ifNull: ["$usuario_sistema", false] },
                                            "$usuario_sistema.nombre",
                                            "$visitante.nombre"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    ubicacion: {
                        $concat: ["$latitud", ", ", "$longitud"],
                    }
                },
            },
            {
                $match: {
                    $and: [
                        empresas?.length
                            ? { id_empresa: { $in: empresas.map((item: string) => new Types.ObjectId(item)) } }
                            : {}
                    ]
                }
            },
            {
                $project: {
                    tipo_dispositivo: 1,
                    usuario: 1,
                    estatus: 1,
                    ubicacion: 1,
                    creado_por: 1,
                    fecha_creacion: 1,
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
                $sort: sortMDB ? sortMDB : { fecha_creacion: -1 }
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
        const registros = await Eventos.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
export async function obtenerTodosKiosco(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa') as IUsuario

        const { filter, pagination, sort, date, panel } = req.query as {
            filter: string;
            pagination: string;
            sort: string;
            date: string;
            panel?: string;
        };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];
        const queryDate = date as QueryParams["date"];
        const queryPanel = panel && panel !== "all" ? String(panel) : "";

        const fecha_busqueda = dayjs(queryDate);
        if (queryPanel && !Types.ObjectId.isValid(queryPanel)) {
            res.status(200).json({ estado: false, mensaje: "Panel de busqueda invalido." });
            return;
        }
        if (!dayjs.isDayjs(fecha_busqueda)) {
            res.status(200).json({ estado: false, mensaje: 'Revisa que la fecha de búsqueda sea válida.' })
            return;
        }

        const entrada = fecha_busqueda.startOf("day").toDate();
        const salida = fecha_busqueda.endOf("day").toDate();

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB,
        } = customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["anfitrion", "nombre", "panel", "acceso"]);

        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        date ? { fecha_creacion: { $gte: entrada, $lte: salida } } : {},
                        { tipo_check: { $in: [5, 6, 7] } },
                        queryPanel ? { id_panel: new Types.ObjectId(queryPanel) } : {}
                    ],
                }
            },
            {
                $set: {
                    id_empleado_effective: { $ifNull: ["$id_empleado", "$id_usuario"] }
                }
            },
            {
                $sort: {
                    id_registro: 1,
                    fecha_creacion: -1
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $and: [{ $ifNull: ["$id_registro", false] }, { $ne: ["$id_registro", null] }] },
                            { registro: "$id_registro" },
                            { usuario: "$id_empleado_effective" }
                        ]
                    },
                    doc: { $first: "$$ROOT" },
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$doc"
                }
            },
            {
                $set: {
                    tipo_origen: {
                        $cond: [
                            { $and: [{ $ifNull: ["$id_registro", false] }, { $ne: ["$id_registro", null] }] },
                            2, // Visitante
                            1  // Usuario
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "registros",
                    localField: "id_registro",
                    foreignField: "_id",
                    as: "registro",
                    pipeline: [
                        {
                            $lookup: {
                                from: "usuarios",
                                localField: "id_anfitrion",
                                foreignField: "_id",
                                as: "anfitrion",
                                pipeline: [

                                    {
                                        $project: {
                                            id_empresa: 1,
                                            nombre: {
                                                $concat: ["$nombre", " ", "$apellido_pat", " ", { $ifNull: ["$apellido_mat", ""] }]
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $set: {
                                anfitrion: { $arrayElemAt: ["$anfitrion", 0] }
                            }
                        },
                        {
                            $project: {
                                id_empresa: "$anfitrion.id_empresa",
                                img_usuario: 1,
                                anfitrion: "$anfitrion.nombre",
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", { $ifNull: ["$apellido_mat", ""] }]
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "empleados",
                    localField: "id_empleado_effective",
                    foreignField: "_id",
                    as: "usuario",
                    pipeline: [
                        {
                            $project: {
                                id_empresa: 1,
                                img_usuario: 1,
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", { $ifNull: ["$apellido_mat", ""] }]
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "hikvision_dispositivos",
                    localField: "id_panel",
                    foreignField: "_id",
                    as: "panel",
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
                    from: 'accesos',
                    localField: 'id_acceso',
                    foreignField: '_id',
                    as: 'acceso',
                    pipeline: [{
                        $project: {
                            nombre: 1
                        }
                    }],
                },
            },
            {
                $set: {
                    usuario: { $arrayElemAt: ["$usuario", -1] },
                    registro: { $arrayElemAt: ["$registro", -1] },
                    panel: { $arrayElemAt: ["$panel", -1] },
                    acceso: { $arrayElemAt: ["$acceso", -1] },
                }
            },
            {
                $set: {
                    panel: "$panel.nombre",
                    acceso: "$acceso.nombre",
                    generales: {
                        $cond: [
                            { $ifNull: ["$usuario", false] },
                            "$usuario",
                            "$registro"
                        ]
                    }
                }
            },
            {
                $set: {
                    img_usuario: "$generales.img_usuario",
                    anfitrion: "$generales.anfitrion",
                    nombre: "$generales.nombre",
                    id_empresa: "$generales.id_empresa"
                }
            },
            { $match: isMaster ? {} : { id_empresa: id_empresa } },
            {
                $set: {
                    img_usuario: {
                        $cond: {
                            if: { $eq: ["$img_evento", ""] },
                            then: "$img_usuario",
                            else: "$img_evento"
                        }
                    },
                }
            },
            {
                $project: {
                    img_usuario: 1,
                    anfitrion: 1,
                    nombre: 1,
                    tipo_check: 1,
                    fecha_creacion: 1,
                    tipo_origen: 1,
                    panel: 1,
                    acceso: 1,
                    id_registro: 1,
                    id_usuario: 1,
                    id_empleado: "$id_empleado_effective"
                }
            }
        ];

        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB,
                },
            });
        }

        aggregation.push(
            {
                $setWindowFields: {
                    sortBy: { fecha_creacion: -1 }, // Para el firstRecord
                    output: {
                        isMostRecent: { $documentNumber: {} }
                    }
                }
            },
            {
                $sort: sortMDB ? sortMDB : { fecha_creacion: -1 }
            },
            {
                $facet: {
                    paginatedResults: [
                        { $match: { isMostRecent: { $ne: 1 } } },
                        { $skip: paginationMDB.skip },
                        { $limit: paginationMDB.limit }
                    ],
                    stats: [
                        {
                            $group: {
                                _id: null,
                                totalCount: { $sum: 1 },
                                totalCountUserIn: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo_origen", 1] }, // Es usuario
                                                    { $eq: ["$tipo_check", 5] }   // Y tipo_check es 5
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                totalCountVisitIn: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo_origen", 2] }, // Es visita
                                                    { $eq: ["$tipo_check", 5] }   // Y tipo_check es 5
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                totalCountUserOut: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo_origen", 1] }, // Es usuario
                                                    { $eq: ["$tipo_check", 6] }   // Y tipo_check es 6
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                totalCountVisitOut: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo_origen", 2] }, // Es visita
                                                    { $eq: ["$tipo_check", 6] }   // Y tipo_check es 6
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    firstRecord: [
                        { $match: { isMostRecent: 1 } },
                        { $project: { isMostRecent: 0 } } // Eliminamos el campo temporal
                    ]
                }
            },
            {
                $project: {
                    paginatedResults: 1,
                    stats: { $arrayElemAt: ["$stats", 0] },
                    firstRecord: { $arrayElemAt: ["$firstRecord", 0] }
                }
            }
        );

        const registros = await Eventos.aggregate(aggregation);

        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerPanelesKiosco(_req: Request, res: Response): Promise<void> {
    try {
        const paneles = await DispositivosHv.find(
            { activo: true },
            { nombre: 1, direccion_ip: 1 }
        ).sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: paneles });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerAlertasRelojPaneles(_req: Request, res: Response): Promise<void> {
    try {
        const alertas = await DispositivosHv.find(
            { activo: true, reloj_alerta_activa: true },
            {
                nombre: 1,
                direccion_ip: 1,
                reloj_offset_segundos: 1,
                reloj_ultimo_desfase_segundos: 1,
                reloj_ultima_muestra: 1,
            }
        ).sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: alertas });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormEventos(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;

        const empresas = await Empresas.find(isMaster ? { activo: true } : { _id: id_empresa, activo: true }, 'nombre pisos activo').sort({ nombre: 1 });
        const usuarios = await Empleados.find(isMaster ? { activo: true } : { id_empresa: new Types.ObjectId(id_empresa), activo: true }, { nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] } } as any).sort({ nombre: 1 })
        res.status(200).json({ estado: true, datos: { usuarios, empresas } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormReporteHoras(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const isMaster = (req as UserRequest).isMaster;
        const { id_empresa } = await Usuarios.findById(id_usuario, 'id_empresa rol') as IUsuario;

        const empresas = await Empresas.find(isMaster ? { activo: true } : { _id: id_empresa, activo: true }, 'nombre pisos activo').sort({ nombre: 1 });
        const usuarios = await Empleados.find(isMaster ? { activo: true } : { id_empresa: new Types.ObjectId(id_empresa), activo: true }, { nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] } } as any).sort({ nombre: 1 })
        res.status(200).json({ estado: true, datos: { usuarios, empresas } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Eventos.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(req.params.id)
                }
            },
            {
                $set: {
                    id_empleado_effective: { $ifNull: ["$id_empleado", "$id_usuario"] }
                }
            },
            {
                $lookup: {
                    from: "horarios",
                    localField: "id_horario",
                    foreignField: "_id",
                    as: "horario",
                    pipeline: [
                        {
                            $project: {
                                horario: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "empleados",
                    localField: "id_empleado_effective",
                    foreignField: "_id",
                    as: "usuario",
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
                    from: "usuarios",
                    localField: "validado_por",
                    foreignField: "_id",
                    as: "validado_por",
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
                    from: "usuarios",
                    localField: "creado_por",
                    foreignField: "_id",
                    as: "creado_por",
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
                    from: "usuarios",
                    localField: "modificado_por",
                    foreignField: "_id",
                    as: "modificado_por",
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
                    from: "accesos",
                    localField: "id_acceso",
                    foreignField: "_id",
                    as: "acceso",
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
                    acceso: { $arrayElemAt: ["$acceso", -1] },
                    horario: { $arrayElemAt: ["$horario", -1] },
                    usuario: { $arrayElemAt: ["$usuario", -1] },
                    validado_por: { $arrayElemAt: ["$validado_por", -1] },
                    creado_por: { $arrayElemAt: ["$creado_por", -1] },
                    modificado_por: { $arrayElemAt: ["$modificado_por", -1] },
                },
            },
            {
                $set: {
                    usuario: "$usuario.nombre",
                    validado_por: "$validado_por.nombre",
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                    ubicacion: {
                        $concat: ["$latitud", ", ", "$longitud"],
                    },
                    acceso: {
                        $trim: {
                            input: { $concat: ["$acceso.identificador", " - ", "$acceso.nombre"] }
                        }
                    },
                },
            },
            {
                $project: {
                    usuario: 1,
                    tipo_dispositivo: 1,
                    img_usuario: 1,
                    img_evento: 1,
                    qr: 1,
                    tipo_check: 1,
                    horario: 1,
                    acceso: 1,
                    esAutorizado: 1,
                    validado_por: 1,
                    comentario: 1,
                    ubicacion: 1,
                    fecha_creacion: 1,
                    creado_por: 1,
                    fecha_modificacion: 1,
                    modificado_por: 1,
                }
            }
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Evento no encontrado." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerImagen(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Eventos.findById(req.params.id, "img_evento img_perfil");
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

export async function validarQr(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;
        const { qr, tipo_check: tipo_evento, lector } = req.body;
        const regexIDGeneral = /^[\d]+$/;
        const regexCardCode = /^VST[A-Z0-9]{16}$/;
        let comentario = "";
        if (![0, 1].includes(Number(lector))) {
            comentario = "El tipo de lector no se reconoce.";
            await guardarEventoNoValido("", "", comentario, id_usuario, qr);
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        if (lector == 1 && ![1, 2, 3, 4, 5, 6, 7].includes(Number(tipo_evento))) {
            comentario = "El tipo de evento no es válido.";
            await guardarEventoNoValido("", "", comentario, id_usuario, qr);
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        if (!regexIDGeneral.test(qr) && !regexCardCode.test(qr)) {
            comentario = "Formato de QR es inválido.";
            await guardarEventoNoValido("", "", comentario, id_usuario, qr);
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        if (regexCardCode.test(qr)) {
            if (lector === 1) {
                res.status(200).json({ estado: false, mensaje: "No puedes leer QR de visitantes en el lector del Check In / Out." });
                return;
            }
            const registro = await Registros.aggregate([
                {
                    $match: {
                        codigo: String(qr),
                        activo: true
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
                        id_visitante: 1,
                        tipo_registro: 1,
                        accesos: 1,
                        canAccess: 1,
                        activo: 1,
                        fecha_entrada: 1,
                        nombre: {
                            $trim: {
                                input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                            }
                        },
                    }
                },
                {
                    $limit: 1
                },
                {
                    $sort: {
                        fecha_entrada: 1
                    }
                }
            ]);
            if (!registro[0]) {
                comentario = "El registro no fue encontrado o ya no se encuentra disponible.";
                await guardarEventoNoValido("", "", comentario, id_usuario, qr);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            const { _id: id_registro, tipo_registro, fecha_entrada, nombre, accesos, canAccess, id_visitante, activo } = registro[0];
            if (!activo) {
                comentario = "El registro ya no esta disponible.";
                await guardarEventoNoValido("", "", comentario, id_usuario, qr, id_registro);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            if (accesos.length === 0) {
                comentario = "Se deben definir los accesos a los cuales el visitante tendrá acceso.";
                await guardarEventoNoValido("", "", comentario, id_usuario, qr, id_registro);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            const canAllowAccess = (accesos as IRegistro["accesos"]).some((item) => String(item.id_acceso) === String(id_acceso));
            if (!canAllowAccess) {
                comentario = "No estás autorizado para dar acceso a este visitante, debe dirigirse al acceso correspondiente.";
                await guardarEventoNoValido("", "", comentario, id_usuario, qr, id_registro);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            const { tiempoToleranciaEntrada } = await Configuracion.findOne({}, 'tiempoToleranciaEntrada') as IConfiguracion;
            const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
            const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;
            const fecha_actual = dayjs();

            const entrada_before = dayjs(fecha_entrada).subtract(tiempoEntrada, tipoEntrada);
            const entrada_after = dayjs(fecha_entrada).add(tiempoEntrada, tipoEntrada)

            if (tipo_registro == 1) {
                if (fecha_actual.isBefore(entrada_before)) {
                    comentario = `El visitante ${nombre} aún no puede acceder, verifica su hora de entrada.`;
                    await guardarEventoNoValido("", "", comentario, id_usuario, qr, id_registro);
                    res.status(200).json({ estado: false, mensaje: comentario });
                    return;
                }
                if (fecha_actual.isAfter(entrada_after)) {
                    comentario = `El visitante ${nombre} ya no puede acceder, su hora de entrada ha expirado.`;
                    await guardarEventoNoValido("", "", comentario, id_usuario, "");
                    res.status(200).json({ estado: false, mensaje: comentario });
                    return;
                }
            }
            if (tipo_registro === 1 && !canAccess) {
                res.status(200).json({ estado: true, datos: { id_registro, puedeAcceder: canAccess } });
                return;
            } else {
                const { estado, datos: ulitmo_evento, mensaje } = await obtenerUltimoEvento(id_registro, [5, 6], id_acceso);
                if (!estado) {
                    comentario = mensaje || "Hubo un error inesperado.";
                    await guardarEventoNoValido("", "", comentario, id_usuario, qr, id_registro);
                    res.status(200).json({ estado: false, mensaje: comentario });
                    return;
                }
                const tipo_evento = ulitmo_evento === 5 ? 6 : 5;
                await cambiarEventoRegistro({
                    tipo_dispositivo: 2,
                    tipo_check: tipo_evento,
                    id_registro,
                    id_usuario,
                    id_acceso,
                    id_visitante
                }, { _id: 1 }) as IRegistro;
                res.status(200).json({ estado: true, datos: { id_registro, puedeAcceder: canAccess } });
                return;
            }
        }
        if (regexIDGeneral.test(qr)) {
            if (lector === 0) {
                res.status(200).json({ estado: false, mensaje: "No puedes leer QR de empleados en el lector de la bitacora." });
                return;
            }
            const empleado = await Empleados.findOne({
                $or: [
                    { id_empleado: Number(qr) },
                    { id_general: Number(qr) }
                ]
            } as any, "activo id_horario");
            if (!empleado) {
                comentario = "El empleado no fue encontrado.";
                await guardarEventoNoValido("", "", comentario, id_usuario, qr);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            if (!empleado.activo) {
                comentario = "El empleado ya no esta disponible.";
                await guardarEventoNoValido("", "", comentario, id_usuario, qr, null, null, id_usuario);
                res.status(200).json({ estado: false, mensaje: comentario });
                return;
            }
            const { validarHorario, autorizacionCheck } = await Configuracion.findOne({}) as IConfiguracion;
            const { id_horario } = empleado as any;
            if (!validarHorario || !id_horario) {
                res.status(200).json({ estado: true, datos: { comentario: "", fecha_check: new Date(), autorizacionCheck: false } });
                return;
            }
            const datos = await validacionHorario(id_horario, tipo_evento);
            res.status(200).json({ estado: true, datos: { ...datos, autorizacionCheck } })
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function validarRostro(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;
        const { descriptor, tipo_dispositivo, img_evento, latitud, longitud, fecha_evento } = req.body;
        let comentario = "";
        if (!descriptor) {
            comentario = "No se ha detectado ningún rostro.";
            await guardarEventoNoValido(img_evento, "", comentario, id_usuario, "");
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        const descriptors = await FaceDescriptors.find({ id_usuario: { $ne: null }, activo: true });
        if (descriptors.length <= 0) {
            comentario = "No hay información almacenada para realizar una comparación.";
            await guardarEventoNoValido(img_evento, "", comentario, id_usuario, "");
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        const faceDetector = new FaceDetector();
        const { estado, id_usuario: id_usuario_result, id_visitante: id_visitante_result, similitud } = await faceDetector.verificarAcceso(descriptor, descriptors);
        if (!estado) {
            comentario = "No se encontró tu información dentro del sistema.";
            await guardarEventoNoValido(img_evento, "", comentario, id_usuario, "");
            res.status(200).json({ estado: false, mensaje: comentario });
            return;
        }
        let registro = null;
        if (id_usuario_result) {
            registro = await Empleados.findById(id_usuario_result, {
                nombre: {
                    $trim: {
                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                    }
                },
                activo: 1,
                img_usuario: 1
            })
        }
        if (id_visitante_result) {
            registro = await Visitantes.findById(id_visitante_result, {
                nombre: {
                    $trim: {
                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                    }
                },
                activo: 1,
                img_usuario: 1
            })
        }
        if (!registro?.activo) {
            res.status(200).json({ estado: false, mensaje: "Lo siento pero no tienes permitido acceder a las instalaciones" });
            return;
        }

        const evento = new Eventos({
            id_usuario: id_usuario_result ? id_usuario_result : null,
            id_visitante: id_visitante_result ? id_visitante_result : null,
            tipo_dispositivo,
            img_evento,
            img_usuario: registro.img_usuario,
            tipo_check: 7,
            id_acceso: id_acceso || null,
            latitud,
            longitud,
            similitud: similitud ? similitud : 0,
            creado_por: id_usuario,
            fecha_creacion: new Date(fecha_evento)
        });
        await evento.save();
        socket.emit("eventos:nuevo-evento", {
            id_evento: evento._id
        });
        res.status(200).json({ estado: true, datos: registro })
    } catch (error: any) {
        console.log(error)
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const id_acceso = (req as UserRequest).accessId;
        const { id_general, tipo_dispositivo, img_evento, tipo_check, fecha_check, comentario, latitud, longitud, similitud, advertencia, validado_por } = req.body;
        const empleado = await Empleados.findOne({
            $or: [
                { id_empleado: Number(id_general) },
                { id_general: Number(id_general) }
            ]
        } as any, {
            img_usuario: 1, id_horario: 1, nombre: {
                $trim: {
                    input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                }
            }
        }) as any;
        if (!empleado) {
            res.status(200).json({ estado: false, mensaje: "El empleado no fue encontrado." });
            return;
        }
        const { _id: ID, img_usuario, id_horario, nombre } = empleado;
        const currentDate = dayjs();
        const fecha_evento = dayjs(fecha_check);

        const tipo_evento = [1, 2, 3].includes(Number(tipo_check)) ? 5 : [4, 5, 6].includes(Number(tipo_check)) ? 6 : [7].includes(Number(tipo_check)) ? 7 : 0;
        const esAutorizado = validado_por ? 1 : 2;
        if (!tipo_evento) {
            res.status(200).json({ estado: false, mensaje: "Ocurrió un error inesperado, vuelve a intentarlo." })
            return;
        }

        const evento = new Eventos({
            qr: id_general,
            id_usuario: ID,
            tipo_dispositivo,
            img_evento,
            img_usuario,
            tipo_check: tipo_evento,
            id_horario: id_horario || null,
            validado_por: validado_por || null,
            id_acceso: id_acceso || null,
            esAutorizado,
            comentario,
            latitud,
            longitud,
            similitud: similitud ? similitud : 0,
            advertencia,
            creado_por: id_usuario,
            fecha_creacion: fecha_evento.toDate()
        })
        await evento.save();
        if ([5, 6, 7].includes(tipo_evento)) {
            socket.emit("eventos:nuevo-evento", {
                id_evento: evento._id
            });
        }
        if (!!validado_por) {
            const { correoUnoAutorizacion, correoDosAutorizacion, notificarCheck } = await Configuracion.findOne({}) as IConfiguracion;
            if (notificarCheck) {
                const { horario } = await Horarios.findById(id_horario, 'horario') as IHorario;
                const currentDay = currentDate.get("day");
                const currentHorario = horario[currentDay];
                let tipo = '';
                let label = esAutorizado ? "autorizada" : "rechazada"
                switch (tipo_evento) {
                    case 5:
                        tipo = 'Entrada ' + label;
                        break;
                    case 6:
                        tipo = 'Salida ' + label;
                        break;
                }
                const datosCorreo = {
                    tipo,
                    id_general,
                    nombre,
                    entrada_horario: currentDate.set("hours", currentHorario.entrada.hora).set("minutes", currentHorario.entrada.minuto).format("HH:mm"),
                    salida_horario: currentDate.set("hours", currentHorario.salida.hora).set("minutes", currentHorario.salida.minuto).format("HH:mm"),
                    fecha_creacion: fecha_evento.format("DD/MM/YYYY, HH:mm a"),
                    fecha_actual: currentDate.format("DD/MM/YYYY, HH:mm a"),
                    comentario
                }
                correoUnoAutorizacion && enviarCorreoNotificarCheck(correoUnoAutorizacion, datosCorreo);
                correoDosAutorizacion && enviarCorreoNotificarCheck(correoDosAutorizacion, datosCorreo);
            }
        }
        res.status(200).json({ estado: true, datos: { nombre } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}


export async function autorizarCheck(req: Request, res: Response): Promise<void> {
    try {
        const { qr } = req.body;
        const regexNumber = /^\d/;
        if (!regexNumber.test(qr)) {
            res.status(200).json({ estado: false, mensaje: 'QR no válido.' });
            return;
        }
        const registro = await Usuarios.findOne({ id_general: qr, rol: { $in: [2] } }, 'activo');
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'El usuario no es recepcionista.' });
            return;
        }
        if (!registro.activo) {
            res.status(200).json({ estado: false, mensaje: 'El usuario ya no esta disponible.' });
            return;
        }
        res.status(200).json({ estado: true, datos: registro._id })
        return;
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send();
    }
};

type ReporteHoras = {
    id_usuario: string;
    id_general: number;
    nombre: string;
    total_horas: number;
    dias_laborados: string[];
    alertas: { alerta: string; }[][]
}

export async function obtenerReporteHoras(req: Request, res: Response): Promise<void> {
    try {
        const { usuarios, empresas, fecha_inicio, fecha_final } = req.body.datos;
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
            ["id_general", "nombre", "total_horas", "dias_laborados", "alertas"]
        );
        const aggregation: PipelineStage[] = [
            {
                $project: {
                    id_general: 1,
                    fecha_creacion: 1,
                    tipo_check: 1
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
                $sort: sortMDB ? sortMDB : { fecha_creacion: 1 }
            },
        )
        const reporteHoras: ReporteHoras[] = [];
        const usuariosReg = await Usuarios.aggregate([
            {
                $match: {
                    $and: [
                        usuarios?.length
                            ? { _id: { $in: usuarios.map((item: string) => new Types.ObjectId(item)) } }
                            : {},
                        empresas?.length
                            ? { id_empresa: { $in: empresas.map((item: string) => new Types.ObjectId(item)) } }
                            : {},
                    ]
                }
            },
            {
                $set: {
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    }
                }
            },
            {
                $project: {
                    id_general: 1,
                    nombre: 1
                }
            },
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
        ]);
        const totalFechas = getDaysArray(fecha_inicio, fecha_final);
        for await (const usuario of usuariosReg[0].paginatedResults) {
            let reporteUsuario: ReporteHoras;
            const reportePorDia: { dias_laborados: string; total_tiempo: number; alertas: null | { alerta: string; }[]; }[] = [];
            const alertasTotales: { alerta: string; }[][] = [];
            const tiempoTotal: number[] = [];
            const diasLaborados: string[] = [];
            for await (const fecha of totalFechas) {
                const inicio = dayjs(fecha).startOf('day').toDate();
                const final = dayjs(fecha).endOf('day').toDate();
                const eventos = await Eventos.aggregate([
                    {
                        $match: {
                            $and: [
                                { id_usuario: new Types.ObjectId(usuario._id) },
                                { id_registro: null },
                                { tipo_check: { $in: [5, 6] } },
                                { fecha_creacion: { $gte: inicio, $lt: final } }
                            ]
                        }
                    },
                    ...aggregation
                ]);
                if (eventos.length > 0) {
                    const reporte = await obtenerReportesGeneral(eventos, fecha)
                    reportePorDia.push(reporte)
                }
            }
            reportePorDia.map((reportUser) => {
                if (reportUser.alertas) {
                    alertasTotales.push(reportUser.alertas);
                }
                diasLaborados.push(reportUser.dias_laborados);
                tiempoTotal.push(reportUser.total_tiempo);
            });
            reporteUsuario = {
                id_usuario: usuario._id,
                id_general: usuario.id_general,
                nombre: usuario.nombre,
                total_horas: tiempoTotal.reduce((a, b) => a + b, 0),
                dias_laborados: diasLaborados,
                alertas: alertasTotales
            }
            reporteHoras.push(reporteUsuario);
        }
        res.status(200).json({ estado: true, datos: { paginatedResults: reporteHoras, totalCount: [{ count: usuariosReg[0].totalCount[0].count }] } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

type ReportIndividual = {
    fecha: string;
    fecha_full: string;
    entrada: string;
    salida: string;
    detalle: number;
    alertas: { alerta: string; }[];
}

export async function obtenerReporteIndividual(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = req.params.id;
        const { inicio, final } = req.body;
        const registros: ReportIndividual[] = [];
        const totalFechas = getDaysArray(Number(inicio), Number(final));
        for await (const fecha of totalFechas) {
            const inicio = dayjs(fecha).startOf('day').toDate()
            const final = dayjs(fecha).endOf('day').toDate()
            const eventos = await Eventos.aggregate([
                {
                    $match: {
                        $and: [
                            { id_usuario: new Types.ObjectId(id_usuario) },
                            { "fecha_creacion": { $gte: inicio, $lt: final } }
                        ]
                    }
                },
                {
                    $project: {
                        id_general: 1,
                        fecha_creacion: 1,
                        tipo_check: 1
                    }
                },
                {
                    $sort: {
                        fecha_creacion: 1
                    }
                }
            ])
            if (eventos.length > 0) {
                registros.push(await detalleReporte(eventos, fecha))
            }
        }
        res.status(200).json({ estado: true, datos: registros })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
//Flag guardar Eventos
//Funcion para guardar eventos en la base de datos desde el demonio
export async function guardarEventoPanel(req: Request, res: Response): Promise<void> {
    try {
        console.log("[EVENTOS][PANEL] Guardando evento de panel...");
        const { ID, tipo_dispositivo, fecha_creacion, img_check, tipo_check_panel, id_panel } = req.body.datos;

        if (!ID) {
            res.status(200).json({ estado: false, mensaje: "ID de evento invalido." });
            return;
        }

        const { zonaHoraria = "America/Mexico_City" } = await Configuracion
            .findOne({}, "zonaHoraria")
            .lean<{ zonaHoraria?: string }>() || {};

        const fechaPanel = normalizarFechaEventoPanel(fecha_creacion, zonaHoraria);
        if (!fechaPanel.isValid()) {
            res.status(200).json({ estado: false, mensaje: "Fecha de evento invalida." });
            return;
        }

        const fechaServidorRecepcion = dayjs().tz(zonaHoraria).millisecond(0);
        const panelObjectId = id_panel && Types.ObjectId.isValid(String(id_panel))
            ? new Types.ObjectId(String(id_panel))
            : null;
        const panel = panelObjectId
            ? await DispositivosHv.findById(
                panelObjectId,
                "id_acceso reloj_offset_segundos reloj_alerta_activa reloj_ultimo_desfase_segundos reloj_ultima_muestra"
            ).lean<{
                _id: Types.ObjectId;
                id_acceso?: Types.ObjectId;
                reloj_offset_segundos?: number;
                reloj_alerta_activa?: boolean;
                reloj_ultimo_desfase_segundos?: number;
                reloj_ultima_muestra?: Date;
            }>()
            : null;

        const offsetActualSegundos = Number(panel?.reloj_offset_segundos || 0);
        const offsetDetectadoSegundos = detectarOffsetAutomatico(
            fechaPanel,
            fechaServidorRecepcion,
            offsetActualSegundos
        );
        // No corregimos la hora del evento con offset automático/persistido.
        // Se guarda la hora del panel normalizada a la zona configurada.
        const fechaEventoCorregida = fechaPanel.millisecond(0);
        const fechaEventoDate = fechaEventoCorregida.toDate();
        const desfaseRawSegundos = fechaPanel.diff(fechaServidorRecepcion, "second");
        const alertaRelojPanel = Math.abs(desfaseRawSegundos) >= PANEL_CLOCK_ALERT_THRESHOLD_SECONDS;

        if (panelObjectId) {
            const updatePanel: Record<string, unknown> = {
                reloj_alerta_activa: alertaRelojPanel,
                reloj_ultimo_desfase_segundos: desfaseRawSegundos,
                reloj_ultima_muestra: fechaServidorRecepcion.toDate(),
            };
            if (offsetDetectadoSegundos !== null && offsetDetectadoSegundos !== offsetActualSegundos) {
                updatePanel.reloj_offset_segundos = offsetDetectadoSegundos;
                console.warn("[EVENTOS][PANEL] Offset de reloj detectado automaticamente:", {
                    id_panel: String(panelObjectId),
                    offset_segundos: offsetDetectadoSegundos,
                });
            }
            await DispositivosHv.updateOne({ _id: panelObjectId }, { $set: updatePanel });
        }

        const panelEventKey = {
            id_panel: panelObjectId,
            qr: String(ID),
            tipo_dispositivo: Number(tipo_dispositivo),
            tipo_check: Number(tipo_check_panel),
            fecha_creacion: fechaEventoDate,
        };

        const eventoExistente = await Eventos.exists(panelEventKey);
        if (eventoExistente) {
            console.log("[EVENTOS][PANEL] Evento duplicado omitido:", panelEventKey);
            res.status(200).json({ estado: false, mensaje: "Evento ya existe." });
            return;
        }

        const regexIDGeneral = /^[\d]+$/;
        const regexCardCode = /^VST[A-Z0-9]{16}$/;
        const imgRaw = typeof img_check === "string" ? img_check : "";
        const imgEvento = REGEX_BASE64.test(imgRaw) ? await resizeImage(imgRaw) : imgRaw;

        const guardarEvento = async (datosEvento: Partial<IEvento>) => {
            const evento = new Eventos({
                ...datosEvento,
                qr: String(ID),
                tipo_dispositivo: Number(tipo_dispositivo),
                fecha_creacion: fechaEventoDate,
                fecha_panel_raw: String(fecha_creacion ?? ""),
                fecha_servidor_recepcion: fechaServidorRecepcion.toDate(),
                desfase_reloj_segundos: desfaseRawSegundos,
                desfase_reloj_alerta: alertaRelojPanel,
                img_evento: imgEvento,
                id_panel: panelObjectId,
                id_acceso: panel?.id_acceso || null,
                tipo_check: Number(tipo_check_panel),
            });

            await evento.save();
            socket.emit("eventos:nuevo-evento", {
                id_evento: evento._id,
            });
            return evento;
        };

        const appendComentario = (base: string | undefined, extra: string | undefined) => {
            if (!extra) return base;
            if (!base) return extra;
            const partes = new Set(
                `${base};${extra}`
                    .split(";")
                    .map((item) => item.trim())
                    .filter(Boolean)
            );
            return Array.from(partes).join(";");
        };

        const validarSecuenciaEvento = async (params: {
            id_empleado?: Types.ObjectId | null;
            id_visitante?: Types.ObjectId | null;
            tipo_check: number;
            fechaEventoDate: Date;
            id_panel?: Types.ObjectId | null;
        }): Promise<{ omitir: boolean; comentario?: string }> => {
            const { id_empleado, id_visitante, tipo_check, fechaEventoDate, id_panel } = params;
            if (![5, 6].includes(tipo_check)) return { omitir: false };

            const personaMatch: Record<string, unknown> =
                id_empleado
                    ? { id_empleado }
                    : id_visitante
                        ? { id_visitante }
                        : {};
            if (!Object.keys(personaMatch).length) return { omitir: false };

            const scopeMatch: Record<string, unknown> = {
                ...personaMatch,
                ...(id_panel ? { id_panel } : {}),
                tipo_check: { $in: [5, 6] },
                fecha_creacion: { $lte: fechaEventoDate },
            };

            const ultimo = await Eventos.findOne(scopeMatch, "tipo_check fecha_creacion")
                .sort({ fecha_creacion: -1 })
                .lean<{ tipo_check?: number; fecha_creacion?: Date }>();

            let comentario: string | undefined;
            if (ultimo?.tipo_check && ultimo?.fecha_creacion) {
                const diffSeg = Math.abs(dayjs(fechaEventoDate).diff(dayjs(ultimo.fecha_creacion), "second"));
                if (ultimo.tipo_check === tipo_check && diffSeg <= LOGICAL_DUPLICATE_WINDOW_SECONDS) {
                    return { omitir: true, comentario: "DUPLICADO_LOGICO_VENTANA_CORTA" };
                }
                if (ultimo.tipo_check === tipo_check) {
                    comentario = appendComentario(
                        comentario,
                        tipo_check === 5 ? "SECUENCIA_REPETIDA_IN" : "SECUENCIA_REPETIDA_OUT"
                    );
                }
            }

            if (tipo_check === 6) {
                const inicioDia = dayjs(fechaEventoDate).startOf("day").toDate();
                const existeInDia = await Eventos.exists({
                    ...personaMatch,
                    ...(id_panel ? { id_panel } : {}),
                    tipo_check: 5,
                    fecha_creacion: { $gte: inicioDia, $lte: fechaEventoDate },
                });
                if (!existeInDia) {
                    comentario = appendComentario(comentario, "OUT_SIN_IN_DIA");
                }
            }

            return { omitir: false, comentario };
        };

        if (regexIDGeneral.test(String(ID))) {
            const empleado = await Empleados.findOne({ id_empleado: Number(ID) } as any, "img_usuario");
            if (empleado) {
                const analisis = await validarSecuenciaEvento({
                    id_empleado: empleado._id,
                    tipo_check: Number(tipo_check_panel),
                    fechaEventoDate,
                    id_panel: panelObjectId,
                });
                if (analisis.omitir) {
                    console.log("[EVENTOS][PANEL] Evento omitido por deduplicacion logica:", {
                        ID,
                        id_panel: panelObjectId ? String(panelObjectId) : null,
                        motivo: analisis.comentario,
                    });
                    res.status(200).json({ estado: false, mensaje: "Evento duplicado logico omitido." });
                    return;
                }
                await guardarEvento({
                    id_empleado: empleado._id,
                    img_usuario: empleado.img_usuario,
                    comentario: analisis.comentario,
                });
                res.status(200).json({ estado: true });
                return;
            }

            const idVisitante = Number(ID) - 990000;
            const visitante = await Visitantes.findOne({ id_visitante: idVisitante });
            if (visitante) {
                const analisis = await validarSecuenciaEvento({
                    id_visitante: visitante._id,
                    tipo_check: Number(tipo_check_panel),
                    fechaEventoDate,
                    id_panel: panelObjectId,
                });
                if (analisis.omitir) {
                    console.log("[EVENTOS][PANEL] Evento omitido por deduplicacion logica:", {
                        ID,
                        id_panel: panelObjectId ? String(panelObjectId) : null,
                        motivo: analisis.comentario,
                    });
                    res.status(200).json({ estado: false, mensaje: "Evento duplicado logico omitido." });
                    return;
                }
                await guardarEvento({
                    id_visitante: visitante._id,
                    img_usuario: (visitante as any).img_usuario || "",
                    comentario: analisis.comentario,
                });
                res.status(200).json({ estado: true });
                return;
            }

            // Fallback: no se descarta el evento, se guarda sin relación para auditoría.
            await guardarEvento({ comentario: "ID_NUMERICO_NO_MAPEADO" });
            console.log("[EVENTOS][PANEL] ID numerico no mapeado, guardado sin relacion:", ID);
            res.status(200).json({ estado: true, mensaje: "Evento guardado sin mapeo de empleado/visitante." });
            return;
        }

        if (regexCardCode.test(String(ID))) {
            const visitante = await Visitantes.findOne({ card_code: ID });
            if (visitante) {
                const analisis = await validarSecuenciaEvento({
                    id_visitante: visitante._id,
                    tipo_check: Number(tipo_check_panel),
                    fechaEventoDate,
                    id_panel: panelObjectId,
                });
                if (analisis.omitir) {
                    console.log("[EVENTOS][PANEL] Evento omitido por deduplicacion logica:", {
                        ID,
                        id_panel: panelObjectId ? String(panelObjectId) : null,
                        motivo: analisis.comentario,
                    });
                    res.status(200).json({ estado: false, mensaje: "Evento duplicado logico omitido." });
                    return;
                }
                await guardarEvento({
                    id_visitante: visitante._id,
                    img_usuario: (visitante as any).img_usuario || "",
                    comentario: analisis.comentario,
                });
                res.status(200).json({ estado: true });
                return;
            }

            // Fallback: no se descarta el evento, se guarda sin relación para auditoría.
            await guardarEvento({ comentario: "CARD_CODE_NO_MAPEADO" });
            console.log("[EVENTOS][PANEL] Card code no mapeado, guardado sin relacion:", ID);
            res.status(200).json({ estado: true, mensaje: "Evento guardado sin mapeo de visitante." });
            return;
        }

        console.log("[EVENTOS][PANEL] ID no reconocido:", ID);
        res.status(200).json({ estado: false, mensaje: "ID no reconocido." });
    } catch (error: any) {
        console.error(error);
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

function normalizarFechaEventoPanel(fechaRaw: unknown, zonaHoraria: string) {
    // Se usa la hora del panel TAL CUAL (wall-clock), ignorando offsets embebidos (+08:00/-06:00).
    // Evita desfases mixtos entre paneles con distintos formatos/zonas.
    if (typeof fechaRaw === "string") {
        const raw = fechaRaw.trim();
        const parseWallClock = (year: string, month: string, day: string, time: string, meridiem?: string | null) => {
            let [hh, mm, ss] = time.split(":").map((v) => Number(v));
            if (meridiem) {
                const mer = meridiem.toUpperCase();
                if (mer === "PM" && hh < 12) hh += 12;
                if (mer === "AM" && hh === 12) hh = 0;
            }
            const hhStr = String(hh).padStart(2, "0");
            const fechaBase = `${year}-${month}-${day} ${hhStr}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
            const fechaZona = dayjs.tz(fechaBase, zonaHoraria);
            return fechaZona.isValid() ? fechaZona.millisecond(0) : null;
        };

        // YYYY-MM-DD HH:mm:ss [AM|PM]
        const ymd = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})[T\s](\d{2}:\d{2}:\d{2})(?:\s*([AaPp][Mm]))?/);
        if (ymd) {
            const parsed = parseWallClock(ymd[1], ymd[2], ymd[3], ymd[4], ymd[5]);
            if (parsed) return parsed;
        }

        // MM-DD-YYYY HH:mm:ss [AM|PM]
        const mdy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})[T\s](\d{2}:\d{2}:\d{2})(?:\s*([AaPp][Mm]))?/);
        if (mdy) {
            const parsed = parseWallClock(mdy[3], mdy[1], mdy[2], mdy[4], mdy[5]);
            if (parsed) return parsed;
        }

        // Si es string y no coincide, mejor no reinterpretar offsets: usar fallback local sin plugins.
        const simple = dayjs(raw);
        if (simple.isValid()) return simple.millisecond(0);
    }
    return dayjs(fechaRaw as any).millisecond(0);
}

const PANEL_CLOCK_AUTO_OFFSET_MIN_SECONDS = 4 * 60 * 60; // 4h
const PANEL_CLOCK_AUTO_OFFSET_MAX_SECONDS = 12 * 60 * 60; // 12h
const PANEL_CLOCK_AUTO_OFFSET_HOUR_TOLERANCE_SECONDS = 5 * 60; // 5 min
const PANEL_CLOCK_ALERT_THRESHOLD_SECONDS = 30 * 60; // 30 min
const LOGICAL_DUPLICATE_WINDOW_SECONDS = 20; // 20s

function detectarOffsetAutomatico(
    fechaPanel: Dayjs,
    fechaServidor: Dayjs,
    offsetActualSegundos: number
): number | null {
    if (Math.abs(offsetActualSegundos) > 0) return null;

    const diffSegundos = fechaPanel.diff(fechaServidor, "second");
    const horasRedondeadas = Math.round(diffSegundos / 3600);
    const offsetCandidato = horasRedondeadas * 3600;

    if (!horasRedondeadas) return null;
    if (
        Math.abs(offsetCandidato) < PANEL_CLOCK_AUTO_OFFSET_MIN_SECONDS ||
        Math.abs(offsetCandidato) > PANEL_CLOCK_AUTO_OFFSET_MAX_SECONDS
    ) {
        return null;
    }
    if (Math.abs(diffSegundos - offsetCandidato) > PANEL_CLOCK_AUTO_OFFSET_HOUR_TOLERANCE_SECONDS) {
        return null;
    }
    return offsetCandidato;
}
// Reporte de horas 
const obtenerReportesGeneral = async (
    registros: IEvento[],
    fecha: string): Promise<{
        dias_laborados: string;
        total_tiempo: number;
        alertas: null | { alerta: string }[];
    }> => {
    const onlyExits = registros.filter((item) => item.tipo_check === 6);
    const firstItem = registros.find((item) => item.tipo_check === 5);
    const lastItem = onlyExits[onlyExits.length - 1];
    const fechaEntrada = dayjs(firstItem?.fecha_creacion);
    const fechaSalida = dayjs(lastItem?.fecha_creacion);
    const alertas = validar(registros);
    const diffTime = fechaSalida.diff(fechaEntrada);
    return {
        'dias_laborados': fecha,
        'total_tiempo': diffTime,
        'alertas': alertas.length > 0 ? alertas : null
    }
}

const detalleReporte = async (registros: IEvento[], fecha: string) => {
    const onlyExits = registros.filter((item) => item.tipo_check === 6);
    const firstItem = registros.find((item) => item.tipo_check === 5);
    const lastItem = onlyExits[onlyExits.length - 1];
    const alertas = validar(registros);
    const fechaEntrada = dayjs(firstItem?.fecha_creacion);
    const fechaSalida = dayjs(lastItem?.fecha_creacion);
    return {
        fecha: dayjs(fecha).format("DD/MM/YYYY"),
        fecha_full: fechaEntrada.format("DD/MM/YYYY"),
        entrada: dayjs(fechaEntrada).format("HH:mm:ss"),
        salida: dayjs(fechaSalida).format("HH:mm:ss"),
        detalle: fechaSalida.diff(fechaEntrada),
        alertas: alertas
    };
}

const validar = (registros: IEvento[]): { alerta: string }[] => {
    const onlyExits = registros.filter((item) => item.tipo_check === 6);
    const firstItem = registros.find((item) => item.tipo_check === 5);
    const lastItem = onlyExits[onlyExits.length - 1];
    const alertas: { alerta: string }[] = [];
    let preItem: IEvento;
    if (registros.length > 2) {
        registros.map((curItem) => {
            if (curItem) {
                if (preItem) {
                    if (preItem.tipo_check === 6 && curItem.tipo_check === 5) {
                        alertas.push({ 'alerta': 'Check IN después de un Check OUT' });
                    }
                    if (preItem.tipo_check === 5 && curItem.tipo_check === 5) {
                        alertas.push({ 'alerta': 'Doble Check IN' });
                    }
                    if (preItem.tipo_check === 6 && curItem.tipo_check === 6) {
                        alertas.push({ 'alerta': 'Doble Chek OUT' });
                    }
                }
            }
            preItem = curItem;
        })
    } else {
        if (firstItem?.tipo_check === 6 && lastItem?.tipo_check === 6) {
            alertas.push({ 'alerta': 'No se realizo el Check IN' });
        }
        if (firstItem?.tipo_check === 5 && lastItem?.tipo_check === 5) {
            alertas.push({ 'alerta': 'No se realizo el Check OUT' });
        }
        if (firstItem?.tipo_check === 6 && lastItem?.tipo_check === 5) {
            alertas.push({ 'alerta': 'Check OUT antes de un CHECK IN' });
        }
        if (firstItem?.fecha_creacion === lastItem?.fecha_creacion) {
            alertas.push({ 'alerta': 'Un único registro del día.' })
        }
    }
    const uniqueAlertas = alertas.filter((obj, index, self) =>
        index === self.findIndex((o) => o.alerta === obj.alerta)
    );
    return uniqueAlertas;
}

const getDaysArray = function (start: string | number | Date, end: string | number | Date) {
    const arr = [];
    for (const dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
        arr.push(dayjs(dt).format("YYYY-MM-DD"));
    }
    return arr;
};



