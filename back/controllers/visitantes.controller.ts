import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Excel, { CellFormulaValue, CellHyperlinkValue, CellValue, Column } from 'exceljs';
import fs from 'fs';
import { Types, PipelineStage } from 'mongoose';
import QRCode from 'qrcode';
import { UserRequest } from '../types/express';
import { QueryParams } from '../types/queryparams';
import Visitantes, { IVisitante } from '../models/Visitantes';
import Roles from '../models/Roles';
import Usuarios from '../models/Usuarios';
import { generarCodigoUnico, isEmptyObject, resizeImage, customAggregationForDataGrids, columnToLetter, marcarDuplicados } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import { enviarCorreoNuevoVisitanteHV, enviarCorreoUsuario, enviarCorreoUsuarioNuevaContrasena } from '../utils/correos';
import { fecha, log } from "../middlewares/log";

import { CONFIG } from "../config";

import FaceDetector from '../classes/FaceDetector';
import FaceDescriptors from '../models/FaceDescriptors';


//////
import path from "path";
import dayjs from "dayjs";
import sharp from "sharp";
import { execFile } from "child_process";
import DispositivosHv from "../models/DispositivosHv";
import crypto from "crypto";


// ===============================
// Helper CURL simple
// ===============================
const HV_USER = "admin";
const HV_PASS = "Bardahl2025.";

function generarCardCodeDesdeId(id_visitante: number): string {
  // ID en base36 (letras + números)
  const base36 = id_visitante
    .toString(36)
    .toUpperCase()
    .padStart(6, "0"); // 6 chars

  // Hash corto y determinístico
  const hash = crypto
    .createHash("sha256")
    .update(String(id_visitante))
    .digest("hex")
    .toUpperCase()
    .slice(0, 10); // 10 chars

  // Prefijo fijo (4 chars)
  // TOTAL = 4 + 6 + 10 = 20
  return `VST${base36}${hash}`;
}

const runCurl = (args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(
      "curl",
      args,
      { windowsHide: true, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const out = String(stdout || "").trim();
        const errText = String(stderr || "").trim();
        if (err) return reject(new Error(errText || err.message));
        resolve(out);
      }
    );
  });

const tryParseJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

async function syncVisitanteEnPaneles(params: {
  id_visitante: number;
  fullName: string;
  cardNo: string;
}) {
  const employeeNo = calcEmployeeNo(params.id_visitante);
  const beginTime = dayjs().format("YYYY-MM-DDT00:00:00");
  const endTime = dayjs().format("YYYY-MM-DDT23:59:59");

  const paneles = await DispositivosHv.find(
    { activo: true },
    { direccion_ip: 1 }
  ).lean();

  const panelesOrdenados = [...paneles].sort((a: any, b: any) => {
    const aLocal = String(a.direccion_ip).startsWith("192.168.100.");
    const bLocal = String(b.direccion_ip).startsWith("192.168.100.");
    return Number(bLocal) - Number(aLocal);
  });

  for (const panel of panelesOrdenados as any[]) {
    const ip = panel.direccion_ip;

    try {
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--connect-timeout","1",
        "--max-time","2",
        "--digest","-u", `${HV_USER}:${HV_PASS}`,
        "-X","GET",
        `http://${ip}/ISAPI/System/deviceInfo`,
      ]);
    } catch {
      console.log("[HV] OFFLINE:", ip);
      continue;
    }

    try {
      const urlUser = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--digest","-u", `${HV_USER}:${HV_PASS}`,
        "-H","Content-Type: application/json",
        "-X","POST",
        urlUser,
        "-d", JSON.stringify({
          UserInfo: {
            employeeNo,
            name: params.fullName || `Invitado ${employeeNo}`,
            userType: "visitor",
            userVerifyMode: "faceOrFpOrCardOrPw",
            Valid: { enable: true, beginTime, endTime },
          },
        }),
      ]);

      const urlCard = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--digest","-u", `${HV_USER}:${HV_PASS}`,
        "-H","Content-Type: application/json",
        "-X","POST",
        urlCard,
        "-d", JSON.stringify({
          CardInfo: { employeeNo, cardNo: params.cardNo, cardType: "normalCard" },
        }),
      ]);

      const urlModify = `https://${ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--insecure",
        "--digest","-u", `${HV_USER}:${HV_PASS}`,
        "-H","Content-Type: application/json",
        "-X","PUT",
        urlModify,
        "-d", JSON.stringify({
          UserInfo: {
            employeeNo,
            name: params.fullName || `Invitado ${employeeNo}`,
            userType: "visitor",
            Valid: { enable: true, beginTime, endTime, timeType: "local" },
            RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
            doorRight: "1",
            userVerifyMode: "faceOrFpOrCardOrPw",
          },
        }),
      ]);
    } catch (e: any) {
      console.log("[HV] ERROR panel:", ip, String(e?.message || e).slice(0, 200));
    }
  }
}

const DOC_CHECK_KEYS = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
] as const;

type DocChecks = Record<(typeof DOC_CHECK_KEYS)[number], boolean>;

const normalizeDocChecks = (value?: Partial<DocChecks> | null): DocChecks => ({
  identificacion_oficial: Boolean(value?.identificacion_oficial),
  sua: Boolean(value?.sua),
  permiso_entrada: Boolean(value?.permiso_entrada),
  lista_articulos: Boolean(value?.lista_articulos),
});

const areDocChecksComplete = (value?: Partial<DocChecks> | null): boolean =>
  DOC_CHECK_KEYS.every((key) => Boolean(value?.[key]));

const didDocChecksChange = (
  prev?: Partial<DocChecks> | null,
  next?: Partial<DocChecks> | null
): boolean => {
  const a = normalizeDocChecks(prev);
  const b = normalizeDocChecks(next);
  return DOC_CHECK_KEYS.some((key) => a[key] !== b[key]);
};

///// bloquear y desbloquear visitantes
    function getHoyRangoLocal() {
    // Ventana amplia para evitar desfases de zona horaria.
    // Abarca desde ayer 00:00 hasta dentro de 2 días 23:59:59.
    const beginTime = dayjs().subtract(1, "day").format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().add(2, "day").format("YYYY-MM-DDT23:59:59");
    return { beginTime, endTime };
    }

    function getRangoPasado(diasAtras = 3) {
    // endTime varios días atrás -> ya expiró
    const beginTime = dayjs().subtract(diasAtras + 1, "day").format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().subtract(diasAtras, "day").format("YYYY-MM-DDT23:59:59");
    return { beginTime, endTime };
    }

    function calcEmployeeNo(id_visitante: number) {
    const base = 990000;
    return String(base + Number(id_visitante));
    }

    /**
     * Actualiza vigencia en Hikvision (UserInfo/Modify) para un employeeNo
     * - Intenta en todos los paneles activos
     * - Los paneles caídos se omiten
     */
    async function hvSetValidForEmployee(employeeNo: string, valid: { enable: boolean; beginTime: string; endTime: string }) {
    const paneles = await DispositivosHv.find({ activo: true }, { direccion_ip: 1 }).lean();

    const panelesOrdenados = [...paneles].sort((a: any, b: any) => {
        const aLocal = String(a.direccion_ip).startsWith("192.168.100.");
        const bLocal = String(b.direccion_ip).startsWith("192.168.100.");
        return Number(bLocal) - Number(aLocal);
    });

    for (const panel of panelesOrdenados as any[]) {
        const ip = panel.direccion_ip;

        // quick check
        try {
        await runCurl([
            "--silent", "--show-error", "--fail-with-body",
            "--connect-timeout", "1",
            "--max-time", "2",
            "--digest", "-u", `${HV_USER}:${HV_PASS}`,
            "-X", "GET",
            `http://${ip}/ISAPI/System/deviceInfo`,
        ]);
        } catch {
        continue;
        }

        // modify
        const urlModify = `https://${ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;

        const payload = {
        UserInfo: {
            employeeNo,
            Valid: {
            enable: valid.enable,
            beginTime: valid.beginTime,
            endTime: valid.endTime,
            timeType: "local",
            },
        },
        };

        try {
        await runCurl([
            "--silent", "--show-error", "--fail-with-body",
            "--insecure",
            "--digest", "-u", `${HV_USER}:${HV_PASS}`,
            "-H", "Content-Type: application/json",
            "-X", "PUT",
            urlModify,
            "-d", JSON.stringify(payload),
        ]);
        } catch (e: any) {
        // seguimos con el siguiente panel
        console.log("[HV] Modify ERROR:", ip, String(e?.message || e).slice(0, 200));
        }
    }
    }
/////

const faceDetector = new FaceDetector();

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
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
            ["id_visitante", "empresa", "nombre"]
        );
        const aggregation: PipelineStage[] = [
            {
                $set: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
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
                    contrasena: 0,
                    telefono: 0,
                    correo: 0,
                    token_web: 0,
                    token_app: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                    documentos: 0,
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
                $sort: sortMDB ? sortMDB : { id_visitante: 1 }
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
        const registros = await Visitantes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

// RE_PLAY_3/back/controllers/visitantes.controller.ts

export async function obtenerGrid(req: Request, res: Response): Promise<void> {
    try {
        const { filter = "{}", pagination = "{}", sort = "{}" } = req.query as any;

        const queryFilter = JSON.parse(filter);
        const querySort = JSON.parse(sort);
        const queryPagination = JSON.parse(pagination);

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
        customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["id_visitante", "empresa", "nombre"]
        );

        const aggregation: PipelineStage[] = [
        {
            $set: {
            // nombre completo
            nombre: {
                $trim: {
                input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] },
                },
            },

            // img_usuario boolean
            img_usuario: {
                $cond: {
                if: { $or: [{ $eq: ["$img_usuario", ""] }, { $eq: ["$img_usuario", null] }] },
                then: false,
                else: true,
                },
            },

            // ---- FIX DEFINITIVO ----
            // Si viene string → Date
            // Si ya es Date → se queda
            // Si no existe → null
            desbloqueado_hasta: {
                $cond: [
                { $eq: [{ $type: "$desbloqueado_hasta" }, "string"] },
                { $toDate: "$desbloqueado_hasta" },
                "$desbloqueado_hasta",
                ],
            },

            // bloqueado seguro
            bloqueado: {
                $ifNull: [
                "$bloqueado",
                {
                    $cond: {
                    if: {
                        $and: [
                        { $ne: ["$token_bloqueo", null] },
                        { $ne: ["$token_bloqueo", ""] },
                        ],
                    },
                    then: true,
                    else: false,
                    },
                },
                ],
            },
            },
        },

        {
            $project: {
            codigo: 0,
            apellido_pat: 0,
            apellido_mat: 0,
            contrasena: 0,
            telefono: 0,
            correo: 0,
            token_web: 0,
            token_app: 0,
            token_bloqueo: 0,
            intentos: 0,
            fecha_creacion: 0,
            creado_por: 0,
            fecha_modificacion: 0,
            modificado_por: 0,
            documentos: 0,
            },
        },
        ];

        if (filterMDB?.length) {
        aggregation.push({ $match: { $or: filterMDB } });
        }

        aggregation.push(
        { $sort: sortMDB || { id_visitante: 1 } },
        {
            $facet: {
            paginatedResults: [
                { $skip: paginationMDB.skip },
                { $limit: paginationMDB.limit },
            ],
            totalCount: [{ $count: "count" }],
            },
        }
        );

        const registros = await Visitantes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        console.error(error);
        res.status(500).send({
        estado: false,
        mensaje: `${error.name}: ${error.message}`,
        });
    }
}



export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
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
        const registros = await Visitantes.aggregate(aggregation)
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Visitantes.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
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
                    piso: { $arrayElemAt: ['$piso', 0] },
                    acceso: { $arrayElemAt: ['$acceso', 0] },
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
                    piso: {
                        $trim: {
                            input: { $concat: ["$piso.identificador", " - ", "$piso.nombre"] }
                        }
                    },
                    acceso: {
                        $trim: {
                            input: { $concat: ["$acceso.identificador", " - ", "$acceso.nombre"] }
                        }
                    },
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
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
                    id_acceso: 0,
                    id_empresa: 0,
                    id_horario: 0,
                    arco: 0,
                    usuario: 0
                }
            }
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarVisitante(req: Request, res: Response): Promise<void> {
    try {
        const visitante = await Visitantes.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
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
        if (!visitante[0]) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }
        res.status(200).json({ estado: true, datos: { visitante: visitante[0] } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};


/**
 * CREAR VISITANTE
 * - Guarda visitante
 * - Genera card_code determinístico desde id_visitante
 * - Sincroniza con paneles HV
 * - NO genera QR aquí (eso lo hace obtenerQR)
 */
export async function crear(req: Request, res: Response): Promise<void> {
    console.log("[CREAR] Inicio");

    const t0 = Date.now();
    const lap = (msg: string, extra?: any) => {
        const ms = Date.now() - t0;
        if (extra !== undefined) console.log(`[CREAR][+${ms}ms] ${msg}`, extra);
        else console.log(`[CREAR][+${ms}ms] ${msg}`);
    };

    try {
        const {
        img_usuario,
        nombre,
        apellido_pat,
        apellido_mat,
        empresa,
        telefono,
        correo,
        contrasena,
        documentos_checks,
        } = req.body;

        const id_usuario = (req as UserRequest).userId;

        // 1) Correo único
        const existe = await Usuarios.findOne({ correo }, "_id").lean();
        if (existe) {
        res.status(400).json({ estado: false, mensaje: "Ya existe un usuario con este correo." });
        return;
        }
        lap("correo único");

        // 2) Hash contraseña
        const hash = bcrypt.hashSync(contrasena, 10);
        if (!hash) {
        res.status(500).json({ estado: false, mensaje: "Error al generar contraseña." });
        return;
        }
        lap("hash ok");

        // 3) Validar documentos
        const normalizedDocChecks = normalizeDocChecks(documentos_checks);
        if (!areDocChecksComplete(normalizedDocChecks)) {
        res.status(400).json({
            estado: false,
            mensaje: "Debes marcar todos los documentos requeridos.",
        });
        return;
        }

        // 4) Preparar imagen UNA sola vez
        lap("resizeImage start");
        const imgResized = await resizeImage(img_usuario);
        lap("resizeImage done", { hasImg: !!imgResized });

        // 5) Crear visitante (SIN card_code aún)
        const nuevo = new Visitantes({
        contrasena: hash,
        img_usuario: imgResized,
        nombre,
        apellido_pat,
        apellido_mat,
        empresa,
        telefono,
        correo,
        documentos_checks: normalizedDocChecks,
        creado_por: id_usuario,
        });

        // 6) Validar modelo
        const errores = await validarModelo(nuevo);
        if (!isEmptyObject(errores)) {
        res.status(400).json({ estado: false, mensajes: errores });
        return;
        }

        // 7) Guardar en BD (aquí se genera id_visitante)
        const reg_saved = await nuevo.save();

        lap("mongo save ok", {
        _id: String(reg_saved._id),
        id_visitante: reg_saved.id_visitante,
        });
    // 8) Respuesta (sin verificación ni panel)
    res.status(200).json({
      estado: true,
      datos: {
        _id: String(reg_saved._id),
        id_visitante: reg_saved.id_visitante,
      },
    });

  } catch (error: any) {
    console.log("[CREAR] ERROR:", error?.message || error);
    res.status(500).json({ estado: false, mensaje: "Error interno." });
  }
}

export async function verificar(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "Falta el id del visitante." });
      return;
    }

    const visitante = await Visitantes.findById(id, "_id id_visitante nombre apellido_pat apellido_mat correo card_code documentos_checks").lean<any>();
    if (!visitante) {
      res.status(404).json({ estado: false, mensaje: "Visitante no encontrado." });
      return;
    }

    if (!areDocChecksComplete(visitante.documentos_checks)) {
      res.status(200).json({
        estado: false,
        mensaje: "No puedes verificar un visitante sin todos los documentos.",
      });
      return;
    }

    const fullName = `${visitante.nombre ?? ""} ${visitante.apellido_pat ?? ""} ${visitante.apellido_mat ?? ""}`
      .replace(/\s+/g, " ")
      .trim();

    let cardNo = String(visitante.card_code || "").trim();
    if (!cardNo) {
      cardNo = generarCardCodeDesdeId(Number(visitante.id_visitante));
    }

    const endOfTodayDate = dayjs().endOf("day").toDate();

    await Visitantes.updateOne(
      { _id: visitante._id },
      { $set: { card_code: cardNo, verificado: true, bloqueado: false, desbloqueado_hasta: endOfTodayDate } }
    );

    QRCode.toDataURL(String(cardNo), {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 500,
      margin: 2,
    })
      .then((qrDataUrl) =>
        enviarCorreoNuevoVisitanteHV(
          visitante.correo,
          fullName,
          qrDataUrl
        )
      )
      .then((okMail) => console.log("[VERIFICAR] mail HV ok?", okMail))
      .catch((e) => console.log("[VERIFICAR] mail HV error:", e?.message || e));

    await syncVisitanteEnPaneles({
      id_visitante: Number(visitante.id_visitante),
      fullName,
      cardNo,
    });

    res.status(200).json({
      estado: true,
      datos: {
        _id: String(visitante._id),
        verificado: true,
        card_code: cardNo,
        bloqueado: false,
        desbloqueado_hasta: endOfTodayDate,
      },
    });
  } catch (error: any) {
    console.log("[VERIFICAR] ERROR:", error?.message || error);
    res.status(500).json({ estado: false, mensaje: "Error interno." });
  }
}



/**
 * OBTENER QR DEL VISITANTE
 * - QR = card_code
 * - card_code es determinístico (derivado de id_visitante)
 * - Visitantes viejos se corrigen automáticamente
 * - NO genera valores aleatorios
 */
export async function obtenerQR(req: Request, res: Response): Promise<void> {
    try {
        // El id DEL VISITANTE debe venir en la ruta: /obtenerQR/:id
        const { id } = req.params;

        if (!id) {
        res.status(400).json({
            estado: false,
            mensaje: "Falta el id del visitante.",
        });
        return;
        }

        // Traemos solo lo necesario
        const visitante = await Visitantes.findById(
        id,
        "id_visitante card_code verificado"
        ).lean();

        if (!visitante) {
        res.status(404).json({
            estado: false,
            mensaje: "Visitante no encontrado.",
        });
        return;
        }

        // ⬇️ Cast puntual para TypeScript (lean + mongoose)
        const { card_code, id_visitante, verificado } = visitante as any;

        if (!verificado) {
        res.status(403).json({
            estado: false,
            mensaje: "El visitante no está verificado.",
        });
        return;
        }

        let cardCode = String(card_code || "").trim();

        /**
         * VISITANTE VIEJO
         * - No tenía card_code porque se creó antes
         * - Se RECONSTRUYE desde id_visitante (NO se inventa)
         */
        if (!cardCode) {
        cardCode = generarCardCodeDesdeId(id_visitante);

        await Visitantes.updateOne(
            { _id: id },
            { $set: { card_code: cardCode } }
        );

        console.log("[OBTENER_QR] card_code reconstruido:", cardCode);
        }

        // QR = card_code (MISMO valor que la tarjeta)
        const qr = await QRCode.toDataURL(cardCode, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 400,
        margin: 2,
        });

        res.status(200).json({
        estado: true,
        datos: qr,
        cardCode,
        });
    } catch (error: any) {
        console.log("[OBTENER_QR] ERROR:", error?.message || error);
        res.status(500).json({
        estado: false,
        mensaje: error?.message || "Error interno.",
        });
    }
    }

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, empresa, telefono, correo, contrasena, documentos_checks } = req.body;
        const id_usuario = (req as UserRequest).userId;

        const existe_usuario = await Usuarios.findOne({ correo }, '_id');
        if (existe_usuario) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { correo: "Ya existe un usuario con este correo en el sistema." } });
            return;
        }

        const registroPrev = await Visitantes.findById(
            req.params.id,
            "_id documentos_checks verificado id_visitante"
        ).lean<any>();
        if (!registroPrev) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }

        const docChecksProvided = documentos_checks !== undefined;
        const normalizedDocChecks = docChecksProvided ? normalizeDocChecks(documentos_checks) : null;
        const docChecksChanged = docChecksProvided
            ? didDocChecksChange(registroPrev.documentos_checks, normalizedDocChecks)
            : false;
        const requiereReverificacion = Boolean(registroPrev.verificado) && docChecksChanged;

        let bloqueadoUpdate: { bloqueado?: boolean; desbloqueado_hasta?: Date | null } = {};
        if (requiereReverificacion) {
            const { beginTime, endTime } = getRangoPasado();
            bloqueadoUpdate = {
                bloqueado: true,
                desbloqueado_hasta: new Date(endTime),
            };
            const employeeNo = calcEmployeeNo(Number(registroPrev.id_visitante));
            await hvSetValidForEmployee(employeeNo, { enable: true, beginTime, endTime });
        }

        let updateData = {
            img_usuario: await resizeImage(img_usuario),
            nombre,
            apellido_pat,
            apellido_mat,
            empresa,
            telefono,
            correo,
            contrasena,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
            ...(docChecksProvided ? { documentos_checks: normalizedDocChecks } : {}),
            ...(requiereReverificacion ? { verificado: false } : {}),
            ...bloqueadoUpdate,
        }
        if (contrasena) {
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: 'Hubo un error al generar la contraseña.' });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }
        const registro = await Visitantes.findByIdAndUpdate(
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
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }
        // if (img_usuario) {
        //     await faceDetector.guardarDescriptorUsuario({ id_usu_modif: id_usuario, id_visitante: registro._id, img_usuario: registro.img_usuario });
        // }
        // else {
        //     await faceDetector.deshabilitarDescriptor({ id_usu_modif: id_usuario, id_usuario: registro._id });
        // }
        let correoEnviado = contrasena ? await enviarCorreoUsuarioNuevaContrasena(correo, contrasena) : false;
        // const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
        // if (habilitarIntegracionHv) {
        //     const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: [id_acceso] } });
        //     for await (let panel of paneles) {
        //         const { direccion_ip, usuario, contrasena } = panel;
        //         const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
        //         const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
        //         if (registro.img_usuario) await HVPANEL.getTokenValue();
        //         await HVPANEL.saverUser(registro);
        //     }
        // }
        res.status(200).json({
            estado: true,
            datos: {
                correoEnviado,
                verificado: requiereReverificacion ? false : Boolean(registroPrev.verificado),
                documentos_changed: docChecksChanged,
                requiereReverificacion,
            }
        });
        return;
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const { activo } = req.body;
        const validar_registro = await Visitantes.findOne({ _id: req.params.id, id_visitante: 1 });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'No puede eliminar al usuario maestro.' });
            return;
        }
        const registro = await Visitantes.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado.' });
            return;
        }
        await FaceDescriptors.updateOne({ id_visitante: req.params.id }, { $set: { activo: !activo } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function anonimizar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const validar_registro = await Visitantes.findById(req.params.id, 'nombre correo telefono movil activo');

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

        await Visitantes.findByIdAndUpdate(req.params.id, { $set: { img_usuario: '', apellido_pat: "", apellido_mat: "", correo: correo_arco, modificado_por: id_usuario, fecha_modificacion: Date.now(), arco: true } })
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function cargarProgramacionUsuarios(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { registros: datos, envioCorreos } = req.body;

        let detectoErrores = false;
        const registros = [];
        for await (const registro of datos) {
            let errorPass = false;
            const { contrasena } = registro;
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                errorPass = true;
                return;
            }
            const nuevoUsuario = new Visitantes({ ...registro });
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
            const { contrasena_hashed } = registro;

            const nuevoUsuario = new Visitantes({ ...registro, contrasena: contrasena_hashed, creado_por: id_usuario });
            await nuevoUsuario.save();
            console.log("va a enviar correo a:", registro.correo);
            console.log("envioCorreos:", envioCorreos);
            if (envioCorreos) {
                const { correo, contrasena } = registro;
                const { codigo } = await Visitantes.findById(nuevoUsuario._id, 'codigo') as IVisitante;
                const QR = await QRCode.toDataURL(String(codigo), {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width: 400,
                    margin: 2
                });
                let roles = await Roles.find({ rol: { $in: [10] }, activo: true }, 'nombre');
                const rolesString = roles.map((item) => item.nombre).join(' - ');
                console.log("enviando correo a:", correo);
                resultCorreoUsuario = await enviarCorreoUsuario(correo, contrasena, rolesString, QR);
                console.log("resultado correo:", resultCorreoUsuario);
                if (registrosGuardados) correosEnviados++;
            }
            usuariosCreados++;
            registrosGuardados.push({ ...registro, envioHabilitado: envioCorreos, correoEnviado: resultCorreoUsuario });
        }
        res.status(200).send({ estado: true, datos: { registros: registrosGuardados, visitantes: usuariosCreados, correos: correosEnviados } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const KEYS = {
    'Nombre*': 'nombre',
    'Apellido Paterno*': 'apellido_pat',
    'Apellido Materno': 'apellido_mat',
    'Correo*': 'correo',
    'Contraseña*': 'contrasena',
    'Teléfono': 'telefono',
    'Empresa': 'empresa',
}
const isCellHyperlinkValue = (value: CellHyperlinkValue): value is CellHyperlinkValue => !!value?.hyperlink;
const isCellFormulaValue = (value: CellFormulaValue): value is CellFormulaValue => !!value?.formula;

interface UploadedFile {
    data: Buffer | ArrayBuffer | Uint8Array;
    name: string;
    mimetype: string;
    size: number;
}

export async function cargarFormato(req: Request, res: Response): Promise<void> {
    try {
        const workbook = new Excel.Workbook();
        if (!req.files || !req.files.document) {
            res.status(400).send({ estado: false, mensaje: 'No se ha proporcionado un archivo válido.' });
            return;
        }
        const file = req.files.document;
        const datos: any[] = [];
        const fileData = Buffer.from(Array.isArray(file) ? file[0].data : file.data) as Buffer;
        await workbook.xlsx
            .load(fileData as any)
            .then(workbook => {
                const worksheet = workbook.getWorksheet(1);
                if (worksheet) {
                    const firstRow = worksheet.getRow(1);
                    const keys = Array.isArray(firstRow.values) ? firstRow.values.map((item) => String(item)) : []
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber == 1) return;
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
                                case "Empresa":
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
                        if (!data.nombre && !data.apellido_pat && !data.correo && !data.contrasena) return;
                        datos.push({ _id: new Types.ObjectId(), ...data })
                    });
                }
            })
            .catch((error) => {
                throw error;
            })

        if (datos.length === 0) {
            res.status(400).send({ estado: false, mensaje: 'El archivo está vacío.' });
            return;
        }
        let detectoErrores = false;
        // Validar registros.
        const registros = [];
        for await (let usuario of datos) {
            const nuevoUsuario = new Visitantes({ ...usuario });
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
                const headersValues = [
                    'Nombre*',
                    'Apellido Paterno*',
                    'Apellido Materno',
                    'Correo*',
                    'Contraseña*',
                    'Teléfono',
                    'Empresa',
                ];
                headersValues.map(header => {
                    Columns.push({ header: header, key: header, width: 40 } as Column)
                });
                worksheet.columns = Columns;

                await worksheet.protect(CONFIG.SECRET_EXCELJS, {});
                await workbook
                    .xlsx
                    .writeFile('./temp/formatoUsuarios.xlsx')
                    .then(async () => {
                        añadir().then(async () => {
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

const añadir = async () => {
    const nameFileExcel = './temp/formatoUsuarios.xlsx'
    const workbook = new Excel.Workbook();
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
                { letter: "C", required: false },
                { letter: "D", required: true },
                { letter: "E", required: true },
                { letter: "F", required: false },
                { letter: "G", required: false },
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
                getRowInsert.getCell("F").dataValidation = {
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
}


export const bloquearBack = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Necesitamos id_visitante para calcular employeeNo
        const visitante = await Visitantes.findById(id, "_id bloqueado id_visitante desbloqueado_hasta").lean<any>();
        if (!visitante) {
        return res.status(404).json({ estado: false, mensaje: "Visitante no encontrado" });
        }

        // 1) Hikvision: expirar (ayer)
        const employeeNo = calcEmployeeNo(visitante.id_visitante);
        const { beginTime, endTime } = getRangoPasado();

        await hvSetValidForEmployee(employeeNo, { enable: true, beginTime, endTime });

        // 2) Mongo: marcar bloqueado y limpiar desbloqueo
        const updated = await Visitantes.findByIdAndUpdate(
        id,
        { 
        $set: { 
            bloqueado: true,
            // guarda la fecha real que pusiste en el panel (ayer 23:59:59)
            desbloqueado_hasta: new Date(endTime),
            } 
        },
        { new: true }
        )
        .select("_id bloqueado desbloqueado_hasta")
        .lean<any>();

        return res.json({
        estado: true,
        mensaje: "Visitante bloqueado (vigencia expirada en panel)",
        data: {
            _id: updated._id,
            bloqueado: true,
            desbloqueado_hasta: updated.desbloqueado_hasta ?? null,
        },
        });
    } catch (error: any) {
        console.log("[BLOQUEAR] ERROR:", error?.message || error);
        return res.status(500).json({ estado: false, mensaje: "Error al bloquear visitante" });
    }
};

export const desbloquearBack = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const visitante = await Visitantes.findById(id, "_id bloqueado id_visitante desbloqueado_hasta intentos").lean<any>();
        if (!visitante) {
        return res.status(404).json({ estado: false, mensaje: "Visitante no encontrado" });
        }

        // 1) Hikvision: habilitar solo HOY
        const employeeNo = calcEmployeeNo(visitante.id_visitante);
        const { beginTime, endTime } = getHoyRangoLocal();

        await hvSetValidForEmployee(employeeNo, { enable: true, beginTime, endTime });

        // 2) Mongo: desbloquear hasta hoy fin del día
        

        const updated = await Visitantes.findByIdAndUpdate(
        id,
        { 
        $set: { 
            bloqueado: false,
            intentos: 0,
            // guarda exactamente el endTime que mandaste a Hikvision
            desbloqueado_hasta: new Date(endTime),
            } 
        },
        { new: true }
        )
        .select("_id bloqueado desbloqueado_hasta")
        .lean<any>();

        return res.json({
        estado: true,
        mensaje: "Visitante desbloqueado (válido solo hoy en panel)",
        data: {
            _id: updated._id,
            bloqueado: false,
            desbloqueado_hasta: updated.desbloqueado_hasta,
        },
        });
    } catch (error: any) {
        console.log("[DESBLOQUEAR] ERROR:", error?.message || error);
        return res.status(500).json({ estado: false, mensaje: "Error al desbloquear visitante" });
    }
};
