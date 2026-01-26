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
import { enviarCorreoUsuario, enviarCorreoUsuarioNuevaContrasena } from '../utils/correos';
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

// ===============================
// Helper CURL simple
// ===============================
const HV_USER = "admin";
const HV_PASS = "Bardahl2025.";

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

export async function crear(req: Request, res: Response): Promise<void> {
  console.log("[CREAR] Inicio");

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
    } = req.body;

    const id_usuario = (req as UserRequest).userId;

    // 1) Correo único
    const existe = await Usuarios.findOne({ correo }, "_id");
    if (existe) {
      console.log("[CREAR] Correo duplicado:", correo);
      res.status(400).json({ estado: false, mensaje: "Ya existe un usuario con este correo." });
      return;
    }

    // 2) Hash
    const hash = bcrypt.hashSync(contrasena, 10);
    if (!hash) {
      console.log("[CREAR] Error hash");
      res.status(500).json({ estado: false, mensaje: "Error al generar contraseña." });
      return;
    }

    // 3) Guardar BD
    const nuevo = new Visitantes({
      contrasena: hash,
      img_usuario: await resizeImage(img_usuario),
      nombre,
      apellido_pat,
      apellido_mat,
      empresa,
      telefono,
      correo,
      creado_por: id_usuario,
    });

    const errores = await validarModelo(nuevo);
    if (!isEmptyObject(errores)) {
      console.log("[CREAR] Validación:", errores);
      res.status(400).json({ estado: false, mensajes: errores });
      return;
    }

    const reg_saved = await nuevo.save();

    console.log("[CREAR] Guardado en BD:", {
      id: String(reg_saved._id),
      id_visitante: reg_saved.id_visitante,
      codigo: reg_saved.codigo,
      hasImg: !!reg_saved.img_usuario,
    });

    // =====================================================
    // IMPORTANTÍSIMO: QR = TARJETA (NUMÉRICO SIEMPRE)
    // Usamos el patrón de tu panel: 290xx
    // =====================================================
    const base = 29000;
    const employeeNo = String(base + Number(reg_saved.id_visitante)); // ej 29033
    const cardNo = employeeNo; // MISMO VALOR

    const fullName = `${reg_saved.nombre ?? ""} ${reg_saved.apellido_pat ?? ""} ${reg_saved.apellido_mat ?? ""}`
      .replace(/\s+/g, " ")
      .trim();

    console.log("[CREAR] Datos HV:", { employeeNo, cardNo, fullName });

    // Vigencia (por ahora hoy completo; cámbialo si tienes fechas reales)
    const beginTime = dayjs().format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().format("YYYY-MM-DDT23:59:59");

    // 4) Paneles
    const paneles = await DispositivosHv.find({ activo: true }, { direccion_ip: 1 }).lean();
    console.log("[CREAR] Paneles:", paneles.map((p: any) => p.direccion_ip));

    // 5) Sync a cada panel
    for (const panel of paneles as any[]) {
      const ip = panel.direccion_ip;
      console.log("[HV] Panel:", ip);

      try {
        // ---------- Crear usuario (INTENTO A) ----------
        const urlUser = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;

        const payloadA = {
          UserInfo: {
            employeeNo,
            name: fullName || `Invitado ${employeeNo}`,
            userType: "visitor",
            userVerifyMode: "faceOrFpOrCardOrPw", // firmware viejo lo acepta
            Valid: { enable: true, beginTime, endTime },
          },
        };

        const payloadB = {
          UserInfo: {
            employeeNo,
            name: fullName || `Invitado ${employeeNo}`,
            userType: "visitor",
            Valid: { enable: true, beginTime, endTime },
          },
        };

        let userCreateOut = "";
        try {
          userCreateOut = await runCurl([
            "--silent","--show-error","--fail-with-body",
            "--digest","-u", `${HV_USER}:${HV_PASS}`,
            "-H","Content-Type: application/json",
            "-X","POST", urlUser,
            "-d", JSON.stringify(payloadA),
          ]);
          console.log("[HV] User create A:", userCreateOut.slice(0, 200));
        } catch (e: any) {
          console.log("[HV] User create A FALLÓ -> fallback B:", String(e?.message || e).slice(0, 200));
          userCreateOut = await runCurl([
            "--silent","--show-error","--fail-with-body",
            "--digest","-u", `${HV_USER}:${HV_PASS}`,
            "-H","Content-Type: application/json",
            "-X","POST", urlUser,
            "-d", JSON.stringify(payloadB),
          ]);
          console.log("[HV] User create B:", userCreateOut.slice(0, 200));
        }

        // ---------- Confirmar con Search ----------
        const urlSearch = `http://${ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
        const searchOut = await runCurl([
          "--silent","--show-error","--fail-with-body",
          "--digest","-u", `${HV_USER}:${HV_PASS}`,
          "-H","Content-Type: application/json",
          "-X","POST", urlSearch,
          "-d", JSON.stringify({
            UserInfoSearchCond: {
              searchID: "1",
              maxResults: 1,
              searchResultPosition: 0,
              EmployeeNoList: [{ employeeNo }],
            },
          }),
        ]);

        const searchJson = tryParseJson(searchOut);
        const totalMatches = Number(searchJson?.UserInfoSearch?.totalMatches ?? 0);
        console.log("[HV] Search totalMatches:", totalMatches);

        if (totalMatches === 0) {
          console.log("[HV] No confirmó usuario, no creo tarjeta:", { ip, employeeNo });
          continue;
        }

        // ---------- Crear tarjeta ----------
        const urlCard = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
        const cardOut = await runCurl([
          "--silent","--show-error","--fail-with-body",
          "--digest","-u", `${HV_USER}:${HV_PASS}`,
          "-H","Content-Type: application/json",
          "-X","POST", urlCard,
          "-d", JSON.stringify({
            CardInfo: { employeeNo, cardNo, cardType: "normalCard" },
          }),
        ]);
        console.log("[HV] Card create:", cardOut.slice(0, 200));

        // ---------- Foto ----------
        if (reg_saved.img_usuario) {
        try {
            const tempDir = path.resolve(process.cwd(), "temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            // 1) Base64 -> Buffer
            const base64 = String(reg_saved.img_usuario).split(",").pop() || "";
            const inputBuffer = Buffer.from(base64, "base64");

            // 2) Normalizar a JPEG REAL (esto es clave)
            const outBuffer = await sharp(inputBuffer)
            .rotate()
            .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:2:0" })
            .toBuffer();

            const imgPath = path.join(tempDir, `img_${employeeNo}.jpg`);
            fs.writeFileSync(imgPath, outBuffer);

            console.log("[HV] Foto preparada:", { ip, imgPath, size: outBuffer.length });

            // 3) Subir FaceDataRecord (igual que tu curl bueno)
            const urlFace = `http://${ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

            const faceRecord = {
            faceLibType: "blackFD",
            FDID: "1",
            FPID: employeeNo,
            employeeNo,
            };

            const faceOut = await runCurl([
            "--silent",
            "--show-error",
            "--fail-with-body",
            "--digest",
            "-u",
            `${HV_USER}:${HV_PASS}`,
            "-H",
            "Expect:",
            "-X",
            "POST",
            urlFace,
            "-F",
            `FaceDataRecord=${JSON.stringify(faceRecord)}`,
            "-F",
            `img=@${imgPath.replace(/\\/g, "/")};type=image/jpeg`,
            ]);

            console.log("[HV] Face upload OK:", faceOut.slice(0, 200));
        } catch (e: any) {
            console.log("[HV] Face upload ERROR:", ip);
            console.log(String(e?.message || e)); // aquí debe venir el body del 400
        }
        } else {
        console.log("[HV] Sin foto, omitido");
        }


        console.log("[HV] OK:", ip);
      } catch (e: any) {
        console.log("[HV] ERROR panel:", ip);
        console.log(String(e?.message || e)); // aquí verás el body real del error
      }
    }

    // 6) QR = cardNo (NUMÉRICO)
    const QR = await QRCode.toDataURL(cardNo, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 400,
      margin: 2,
    });
    console.log("[CREAR] QR generado:", cardNo);

    // 7) correo
    const roles = await Roles.find({ rol: { $in: reg_saved.rol }, activo: true }, "nombre");
    const rolesString = roles.map((r) => r.nombre).join(" - ");
    await enviarCorreoUsuario(correo, contrasena, rolesString, QR);
    console.log("[CREAR] Correo enviado:", correo);

    //res.status(200).json({ estado: true, datos: { employeeNo, cardNo } });

    console.log("[CREAR] LLEGÓ AL FINAL ANTES DEL RES.JSON");

    // 👇 AGREGA ESTO
    console.log("[CREAR] RESPUESTA API:", {
    _id: String(reg_saved._id),
    id_visitante: reg_saved.id_visitante,
    codigo: reg_saved.codigo,
    employeeNo,
    cardNo
    });

    // 👇 CAMBIA EL RESPONSE
    res.status(200).json({
    estado: true,
    datos: {
        _id: String(reg_saved._id),           // ID real de Mongo
        id_visitante: reg_saved.id_visitante,
        codigo: reg_saved.codigo,
        employeeNo,
        cardNo
    }
    });
    
  } catch (error: any) {
    console.log("[CREAR] ERROR:", error?.message || error);
    res.status(500).json({ estado: false, mensaje: "Error interno." });
  }
}


export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { img_usuario, nombre, apellido_pat, apellido_mat, empresa, telefono, correo, contrasena } = req.body;
        const id_usuario = (req as UserRequest).userId;

        const existe_usuario = await Usuarios.findOne({ correo }, '_id');
        if (existe_usuario) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { correo: "Ya existe un usuario con este correo en el sistema." } });
            return;
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
            modificado_por: id_usuario
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

export async function desbloquear(req: Request, res: Response): Promise<void> {
    try {
        const validar_registro = await Visitantes.findByIdAndUpdate(req.params.id, { $set: { token_bloqueo: '', intentos: 5 } });
        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado.' });
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
    console.log("[VISITANTES.obtenerQR] Inicio", { id: req.params.id });

    const id_usuario = (req as UserRequest).userId;
    const visitante = await Visitantes.findById(req.params.id || id_usuario, "id_visitante");

    if (!visitante) {
      console.log("[VISITANTES.obtenerQR] No encontrado");
      res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
      return;
    }

    // QR = tarjeta = 29000 + id_visitante (numérico siempre)
    const cardNo = String(29000 + Number((visitante as any).id_visitante));

    console.log("[VISITANTES.obtenerQR] QR value:", cardNo);

    const url = await QRCode.toDataURL(cardNo, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 400,
      margin: 2,
    });

    res.status(200).json({ estado: true, datos: url });
  } catch (error: any) {
    console.log("[VISITANTES.obtenerQR] ERROR:", error?.message || error);
    res.status(500).send();
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
                resultCorreoUsuario = await enviarCorreoUsuario(correo, contrasena, rolesString, QR);
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