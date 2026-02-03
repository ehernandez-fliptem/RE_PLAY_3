import { Request, Response } from "express";
import { PipelineStage, Types } from 'mongoose';
import jwt from "jsonwebtoken";
import { DecodedTokenUser } from '../types/jsonwebtoken';
import DispositivosHv from "../models/DispositivosHv";
import Accesos from "../models/Accesos";
import TiposEventos from "../models/TiposEventos";
import { fecha, log } from "../middlewares/log";
import { validarModelo } from "../validators/validadores";
import { customAggregationForDataGrids, isEmptyObject, decryptPassword, encryptPassword } from "../utils/utils";
import Hikvision from "../classes/Hikvision";
import { QueryParams } from "../types/queryparams";
import { CONFIG } from "../config";
import Configuracion, { IConfiguracion } from "../models/Configuracion";
import Registros from "../models/Registros";
import Usuarios from "../models/Usuarios";
import dayjs, { ManipulateType } from "dayjs";

import Visitantes, { IVisitante } from '../models/Visitantes';

import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";

const safeUnlink = async (filePath: string) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (err: any) {
        if (err?.code !== "ENOENT") {
            console.log("No se pudo eliminar archivo temporal:", filePath, err?.message || err);
        }
    }
};


export async function obtenerTodos(req: Request, res: Response): Promise<void> {

    try {
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB,
        } = customAggregationForDataGrids(queryFilter, querySort, queryPagination, ["nombre"]);

        const aggregation: PipelineStage[] = [];

        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB,
                },
            });
        }

        aggregation.push(
            {
                $lookup: {
                    from: "accesos",
                    localField: "id_acceso",
                    foreignField: "_id",
                    as: "acceso",
                    pipeline: [{ $project: { nombre: 1 } }],
                },
            },
            {
                $set: {
                    acceso: { $arrayElemAt: ["$acceso", -1] },
                },
            },
            {
                $set: {
                    acceso: "$acceso.nombre",
                },
            },
            {
                $project: {
                    nombre: 1,
                    habilitar_citas: 1,
                    acceso: 1,
                    tipo_evento: 1,
                    activo: 1,
                },
            },
            {
                $sort: sortMDB || { nombre: 1 },
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [{ $count: "count" }],
                },
            }
        );

        const registros = await DispositivosHv.aggregate(aggregation);

        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerTodosDemonio(req: Request, res: Response): Promise<void> {
    try {
        const registros = await DispositivosHv.find(
            { activo: true },
            "nombre usuario direccion_ip contrasena tipo_evento"
        );
        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {

        const registro = await DispositivosHv.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(req.params.id),
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
                                nombre: 1
                            }
                        }
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
                $set: {
                    acceso: { $arrayElemAt: ["$acceso", 0] },
                    creado_por: { $arrayElemAt: ["$creado_por", 0] },
                    modificado_por: { $arrayElemAt: ["$modificado_por", 0] },
                },
            },
            {
                $set: {
                    acceso: "$acceso.nombre",
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                },
            },
            {
                $project: {
                    contrasena: 0,
                },
            },
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: "Dispositivo hikvision no encontrado." });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerFormNuevoDispositivosHV(req: Request, res: Response): Promise<void> {
    try {
        const tipos_eventos = await TiposEventos.find({ activo: true, tipo: { $in: [5, 6, 7] } });
        const accesos = await Accesos.find({ activo: true }, "nombre").sort({ nombre: 1 });
        res.status(200).json({ estado: true, datos: { tipos_eventos, accesos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUnoFormEditar(req: Request, res: Response): Promise<void> {

    try {
        const registro = await DispositivosHv.findById(req.params.id, { contrasena: 0 });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Dispositivo hikvision no encontrado." });
            return;
        }
        const accesos = await Accesos.find({ activo: true }, "nombre");
        const tipos_eventos = await TiposEventos.find({ activo: true, tipo: { $in: [5, 6, 7] } });
        res.status(200).json({ estado: true, datos: { dispositivo: registro, accesos, tipos_eventos } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function crear(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, direccion_ip, usuario, contrasena, habilitar_citas, tipo_evento, id_acceso } = req.body;
        const creado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;
        const nuevoRegistro = new DispositivosHv({
            nombre,
            direccion_ip,
            usuario,
            contrasena,
            habilitar_citas,
            tipo_evento,
            id_acceso,
            creado_por: creado_porID.id,
            fecha_creacion: Date.now(),
        });

        const mensajes = await validarModelo(nuevoRegistro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({
                estado: false,
                mensaje: "Revisa que los datos que estás ingresando sean correctos.",
                mensajes,
            });
            return;
        }

        await nuevoRegistro.save();
        await Accesos.updateMany(
            { _id: { $in: id_acceso } },
            { $addToSet: { hikvision_dispositivos: nuevoRegistro._id } }
        );
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, direccion_ip, usuario, contrasena, habilitar_citas, tipo_evento, id_acceso } = req.body;
        const modificado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;
        const updateData: any = {
            nombre,
            direccion_ip,
            usuario,
            habilitar_citas,
            tipo_evento,
            id_acceso,
            fecha_modificacion: Date.now(),
            modificado_por: modificado_porID.id,
        };

        if (contrasena) {
            const hash = encryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: "Hubo un error al generar la contraseña." });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }

        DispositivosHv.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { runValidators: true, new: false }
        )
            .then(async (reg_saved) => {
                if (!reg_saved) {
                    res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
                    return;
                }
                // Sincronizar Accesos:
                const accesoPrevio = reg_saved.id_acceso;
                const accesoNuevo = id_acceso;

                if (!accesoPrevio) {
                    await Accesos.updateMany(
                        { _id: { $in: accesoNuevo } },
                        { $push: { hikvision_dispositivos: req.params.id } }
                    );
                }
                else {
                    if (String(accesoPrevio) !== String(accesoNuevo)) {
                        await Accesos.updateMany(
                            { _id: { $in: accesoPrevio } },
                            { $pull: { hikvision_dispositivos: req.params.id } }
                        );
                        await Accesos.updateMany(
                            { _id: { $in: accesoNuevo } },
                            { $addToSet: { hikvision_dispositivos: req.params.id } }
                        );
                    }
                }
                res.status(200).json({ estado: true });
            })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({
                        estado: false,
                        mensaje: "Revisa que los datos que estás ingresando sean correctos.",
                        mensajes,
                    });
                    return;
                }
                res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
            });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const registro = await DispositivosHv.findByIdAndUpdate(req.params.id, {
            $set: { activo: !req.body.activo },
        });

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "Dispositivo hikvision no encontrado." });
            return;
        }

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}
export async function probarConexion(req: Request, res: Response): Promise<void> {
    try {
        const { usuario, contrasena, direccion_ip } = req.body;
        let contrasena_probar = contrasena;

        if (req.params.id) {
            const registro = await DispositivosHv.findById(req.params.id, "contrasena");
            if (!registro) {
                res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
                return;
            }
            contrasena_probar = contrasena || decryptPassword(registro.contrasena, CONFIG.SECRET_CRYPTO);
        }
        const HVPANEL = new Hikvision(direccion_ip, usuario, contrasena_probar);
        const conexion = await HVPANEL.testConnection();
        res.status(200).json(conexion);
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

/*
export async function sincronizarPanel(req: Request, res: Response): Promise<void> {
    try {
        console.log("Iniciando sincronizasion")
        const panel = await DispositivosHv.findById(req.params.id);
        console.log("1")
        if (!panel) {
            console.log("2")
            res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
            return;
        }
        console.log("3")
        const { habilitar_citas, tipo_evento, id_acceso, direccion_ip, usuario, contrasena } = panel;
        console.log("4")
        const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
        console.log("5")
        const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
        console.log("6")
        //await HVPANEL.getTokenValue();
        if (tipo_evento !== 0) {
            console.log("7")
            const usuariosMDB = await Usuarios.find(
                { accesos: { $in: [id_acceso] } },
                {
                    img_usuario: 1,
                    id_general: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    },
                    activo: 1,
                    fecha_creacion: 1
                }
            );
            const usuariosTotales = await Usuarios.find(
                {},
                {
                    img_usuario: 1,
                    id_general: 1,
                    employeeNo: "$id_general",
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    },
                    activo: 1,
                    fecha_creacion: 1
                }
            );
            //console.log(usuariosTotales);
            console.log("8")
            const usuariosSobrantes = usuariosTotales.filter(
                (ut) => !usuariosMDB.some((umdb) => ut.id_general === umdb.id_general)
            );
            //console.log("usuariosSobrantes" + usuariosSobrantes)
            console.log("8.1")

            let i = 3;

            for await (const registro of usuariosMDB) {

                if(registro.id_general== i){
                    console.log("solo hara el" + i)
                    await HVPANEL.saverUser(registro);
                    //console.log("registro: " + registro)
                }
            }
            
            for await (const registro of usuariosSobrantes) {
                await HVPANEL.deleteUser({ id_general: registro.id_general });
            }
            console.log("8.3")
        }
        console.log("9 ya paso")
        if (habilitar_citas) {
            const { tiempoToleranciaSalida, tiempoToleranciaEntrada } = await Configuracion.findOne({}, 'tiempoToleranciaSalida tiempoToleranciaEntrada') as IConfiguracion;
            const tiempoSalida = Number(tiempoToleranciaSalida.split('/')[0]);
            const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
            const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;
            const tipoSalida = tiempoToleranciaSalida.split('/')[1] as ManipulateType;
        console.log("10")
            let registrosMDB = await Registros.find(
                { "accesos.id_acceso": { $in: [id_acceso] }, "accesos.modo": 2, tipo_registro: { $in: [1, 2] } },
                {
                    codigo: 1,
                    img_usuario: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    },
                    fecha_entrada: 1,
                    activo: 1
                }
            ).lean();
            console.log("11")
            const registrosTotales = await Registros.find(
                { tipo_registro: { $in: [1, 2] } },
                {
                    codigo: 1,
                    img_usuario: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    },
                    fecha_entrada: 1,
                    activo: 1
                }
            );

            const registrosSobrantes = registrosTotales.filter(
                (ut) => !registrosMDB.some((umdb) => ut.codigo === umdb.codigo)
            );

            let registroMDBMapped = registrosMDB.map((item) => ({
                ...item,
                fecha_entrada: dayjs(item.fecha_entrada).subtract(tiempoEntrada, tipoEntrada).toDate(),
                fecha_salida: item.fecha_salida ? dayjs(item.fecha_entrada).add(tiempoSalida, tipoSalida).toDate() : null,
            }));

            for await (const registro of registroMDBMapped) {
                const data = {
                    img_usuario: registro.img_usuario,
                    nombre: registro.nombre,
                    codigo: registro.codigo,
                    fecha_entrada: registro.fecha_entrada,
                    fecha_salida: registro.fecha_salida || undefined,
                    activo: registro.activo,
                };
                await HVPANEL.saveRegister(data);
            }

            for await (const registro of registrosSobrantes) {
                await HVPANEL.deleteRegister({ codigo: registro.codigo });
            }
        }

        if (!habilitar_citas) {
            const registrosMDB = await Registros.find({ tipo_registro: { $in: [1, 2] } }, "visitantes.codigo");
            for await (const registro of registrosMDB) {
                await HVPANEL.deleteRegister({ codigo: registro.codigo });
            }
        }

        if (tipo_evento === 0) {
            const usuariosMDB = await Usuarios.find({}, "id_general");
            for await (const registro of usuariosMDB) {
                await HVPANEL.deleteUser({ id_general: registro.id_general });
            }
        }

        const { card_sync, event_sync, img_sync, register_sync, user_sync } = HVPANEL.getSyncedValues();
        res.status(200).json({
            estado: true,
            datos: {
                eventos: event_sync || 0,
                registros: register_sync || 0,
                usuarios: user_sync || 0,
                tarjetas: card_sync || 0,
                img: img_sync || 0,
            },
        });
        console.log("fin")
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
        console.log(error)
    }
}

*/

/*
export async function sincronizarPanel(req: Request, res: Response): Promise<void> {
        console.log("Estas sincronizando panel 19-01 1454");
        console.log("1.1");
        console.log("1.2");
    // ===============================
    // Helpers internos: curl + JSON
    // ===============================

    // Ejecuta curl y devuelve stdout (string). Si falla, lanza error con stderr.
    const runCurl = (args: string[]): Promise<string> => {
        return new Promise((resolve, reject) => {
        execFile(
            "curl",
            args,
            { windowsHide: true, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
            (err, stdout, stderr) => {
            const out = (stdout || "").trim();
            const errText = (stderr || "").trim();

            if (err) return reject(new Error(errText || err.message));
            if (!out) return reject(new Error("Respuesta vacía de curl"));
            resolve(out);
            }
        );
        });
    };

    // Ejecuta curl y trata de parsear JSON (si no, devuelve texto).
    const runCurlJson = async (args: string[]): Promise<any> => {
        const out = await runCurl(args);
        try {
        return JSON.parse(out);
        } catch {
        return out; // a veces Hikvision devuelve texto
        }
    };

    // Normaliza base64 "data:image/jpeg;base64,xxxx" a puro base64
    const normalizeBase64 = (b64: string) => {
        if (!b64) return "";
        const idx = b64.indexOf("base64,");
        return idx >= 0 ? b64.slice(idx + "base64,".length) : b64;
    };


    // Convierte base64 a JPEG "limpio" usando sharp y lo guarda en temp.
    // Esto evita PNG/WebP camuflados y arregla orientación/tamaño.
        const saveBase64ToTemp = async (b64: string, employeeNo: string) => {
        const dir = path.resolve(process.cwd(), "temp");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);

        // Quitar "data:image/...;base64," si viene así
        const pure = b64.includes(",") ? (b64.split(",").pop() || "") : b64;

        const inputBuffer = Buffer.from(pure, "base64");

        // Normalización para Hikvision:
        // - rotate(): respeta EXIF orientation
        // - resize(): evita imágenes enormes / raras (fit inside)
        // - jpeg(): crea JPEG real (no "jpg" falso)
        const outBuffer = await sharp(inputBuffer)
            .rotate()
            .resize({
            width: 1024,
            height: 1024,
            fit: "inside",
            withoutEnlargement: true,
            })
            .jpeg({
            quality: 90,
            mozjpeg: true,
            chromaSubsampling: "4:2:0",
            })
            .toBuffer();

        const filePath = path.join(dir, `img_${employeeNo}.jpg`);
        fs.writeFileSync(filePath, outBuffer);

        return { filePath, mime: "image/jpeg" as const };
        };

    // ===============================
    // ISAPI helpers: Search / Record
    // ===============================
    const userSearchByEmployeeNo = async (
        ip: string,
        usuario: string,
        pass: string,
        employeeNo: string
    ) => {
        const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;

        // En tu firmware searchID es OBLIGATORIO
        const payload = {
        UserInfoSearchCond: {
            searchID: "1",
            maxResults: 1,
            searchResultPosition: 0,
            EmployeeNoList: [{ employeeNo: String(employeeNo) }],
        },
        };

        const args = [
        "--silent",
        "--show-error",
        "--digest",
        "-u",
        `${usuario}:${pass}`,
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
        "-d",
        JSON.stringify(payload),
        ];

        return runCurlJson(args);
    };

    const userCreate = async (
        ip: string,
        usuario: string,
        pass: string,
        data: {
        employeeNo: string;
        name: string;
        userType: "normal" | "blackList";
        beginTime: string;
        endTime: string;
        }
    ) => {
        const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;

        const payload = {
        UserInfo: {
            employeeNo: String(data.employeeNo),
            name: data.name,
            userType: data.userType,
            localUIRight: false,
            Valid: {
            enable: true,
            beginTime: data.beginTime,
            endTime: data.endTime,
            timeType: "local",
            },
            doorRight: "1",
            RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
            userVerifyMode: "",
        },
        };

        const args = [
        "--silent",
        "--show-error",
        "--digest",
        "-u",
        `${usuario}:${pass}`,
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
        "-d",
        JSON.stringify(payload),
        ];

        return runCurlJson(args);
    };

    const cardCreate = async (
        ip: string,
        usuario: string,
        pass: string,
        employeeNo: string,
        cardNo: string
    ) => {
        const url = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;

        const payload = {
        CardInfo: {
            employeeNo: String(employeeNo),
            cardNo: String(cardNo),
            cardType: "normalCard",
        },
        };

        const args = [
        "--silent",
        "--show-error",
        "--digest",
        "-u",
        `${usuario}:${pass}`,
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
        "-d",
        JSON.stringify(payload),
        ];

        return runCurlJson(args);
    };

    // Subir cara (FaceDataRecord) con multipart.
    // Hikvision suele requerir:
    // -F "FaceDataRecord={...}"
    // -F "img=@file.jpg"
    const faceUpload = async (
        ip: string,
        usuario: string,
        pass: string,
        employeeNo: string,
        fpid: string,
        imagePath: string,
        mimeType: string
        ) => {
        const url = `http://${ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

        const faceRecord = {
            faceLibType: "blackFD",
            FDID: "1",
            FPID: String(fpid),
            employeeNo: String(employeeNo),
        };

        // IMPORTANTE EN WINDOWS: pasar ruta con /
        const imagePathCurl = imagePath.replace(/\\/g, "/");

        const args = [
            "--silent",
            "--show-error",
            "--digest",
            "-u",
            `${usuario}:${pass}`,
            "-X",
            "POST",
            url,

            // Evita problemas con Expect: 100-continue
            "-H",
            "Expect:",

            "-F",
            `FaceDataRecord=${JSON.stringify(faceRecord)}`,

            // Igual que tu curl funcional
            "-F",
            `img=@${imagePathCurl};type=${mimeType}`,
        ];

        return runCurlJson(args);
        };


    // ===============================
    // INICIO: lógica principal
    // ===============================
    try {
        console.log("Sincronizar panel: inicio");

        const panel = await DispositivosHv.findById(req.params.id);
        if (!panel) {
        res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
        return;
        }

        const { tipo_evento, id_acceso, direccion_ip, usuario, contrasena } = panel;

        //const { tipo_evento, id_acceso, usuario, contrasena } = panel;
        /*
        // IP HARDCODE (TEMPORAL)
        const direccion_ip = "172.18.0.31";
        console.log("PANEL IP HARDCODE:", direccion_ip);
        */
       /*
        console.log("PANEL IP REAL:", direccion_ip);

        const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);

        // Si tipo_evento === 0, en tu lógica original significa "borrar todo".
        // Aquí NO borramos nada (modo seguro). Si quieres limpieza, lo hacemos aparte.
        if (tipo_evento === 0) {
        res.status(200).json({
            estado: true,
            mensaje: "tipo_evento=0 (modo seguro): no se borra nada en esta versión autocontenida.",
        });
        return;
        }

        // ===============================
        // 1) Traer usuarios permitidos por acceso (Mongo)
        // ===============================
        const usuariosMDB_raw = await Usuarios.find(
        { accesos: { $in: [id_acceso] } },
        {
            img_usuario: 1,
            id_general: 1,
            nombre: 1,
            apellido_pat: 1,
            apellido_mat: 1,
            activo: 1,
            fecha_creacion: 1,
        }
        ).lean();

        const usuariosMDB = usuariosMDB_raw.map((u: any) => ({
        img_usuario: u.img_usuario,
        id_general: u.id_general,
        nombre: `${u.nombre ?? ""} ${u.apellido_pat ?? ""} ${u.apellido_mat ?? ""}`.trim(),
        activo: !!u.activo,
        fecha_creacion: u.fecha_creacion,
        }));

        console.log("Usuarios a sincronizar:", usuariosMDB.length);

        // Contadores de sincronización
        let user_created = 0;
        let card_created = 0;
        let img_created = 0;
        let failed = 0;

        // ===============================
        // 2) Por cada usuario: buscar y crear si falta (curl)
        // ===============================
        for (const registro of usuariosMDB) {
        const employeeNo = String(registro.id_general);

        try {
            // 2.1) Buscar si existe
            const searchRes = await userSearchByEmployeeNo(direccion_ip, usuario, decrypted_pass, employeeNo);

            const totalMatches = Number(searchRes?.UserInfoSearch?.totalMatches ?? 0);

            // 2.2) Si no existe, crearlo
            if (totalMatches === 0) {
            // beginTime: usa fecha_creacion si existe, si no "hoy"
            const beginTime =
                registro.fecha_creacion
                ? dayjs(registro.fecha_creacion).format("YYYY-MM-DDTHH:mm:ss")
                : dayjs().format("YYYY-MM-DDTHH:mm:ss");

            const createRes = await userCreate(direccion_ip, usuario, decrypted_pass, {
                employeeNo,
                name: registro.nombre || `EMP ${employeeNo}`,
                userType: registro.activo ? "normal" : "blackList",
                beginTime,
                endTime: "2037-12-31T23:59:59",
            });

            if (typeof createRes === "string") {
                console.log("User create text:", createRes);
            } else {
                if (createRes?.statusString === "OK") user_created++;
                else console.log("User create error json:", createRes);
            }

            // 2.3) Crear tarjeta (siempre, o solo si quieres)
            const cardRes = await cardCreate(direccion_ip, usuario, decrypted_pass, employeeNo, employeeNo);
            if (typeof cardRes === "string") {
                console.log("Card create text:", cardRes);
            } else {
                if (cardRes?.statusString === "OK") card_created++;
                else console.log("Card create error json:", cardRes);
            }

            // 2.4) Subir cara si viene imagen y está activo
            if (registro.activo && registro.img_usuario) {
                const employeeNo = String(registro.id_general);

                // Generar JPEG REAL con sharp
                const { filePath, mime } = await saveBase64ToTemp(registro.img_usuario, employeeNo);

                try {
                    console.log("Subiendo foto:", { employeeNo, filePath, mime, existe: fs.existsSync(filePath) });

                    const faceRes = await faceUpload(
                        direccion_ip,
                        usuario,
                        decrypted_pass,
                        employeeNo,
                        employeeNo,
                        filePath,
                        mime
                    );

                    console.log("Respuesta FaceDataRecord:", faceRes);

                    if (typeof faceRes !== "string" && faceRes?.statusString === "OK") {
                        img_created++;
                    }
                } finally {
                    await safeUnlink(filePath);
                }
                }

            } else {
            // Existe: por ahora NO actualizamos (modo simple).
            // Si quieres: aquí metemos Modify + actualizar foto.
            }
        } catch (err: any) {
            failed++;
            console.log("Falló usuario:", employeeNo, err?.message || err);
        }
        }

        // ===============================
        // FIN: respuesta
        // ===============================
        res.status(200).json({
        estado: true,
        datos: {
            usuarios_creados: user_created,
            tarjetas_creadas: card_created,
            fotos_subidas: img_created,
            fallidos: failed,
        },
        mensaje: "Sincronización (modo autocontenido): crea usuarios faltantes con curl.",
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
    }
*/

/////////////////////////////////////

export async function sincronizarVisitanteEnPanel(req: Request, res: Response): Promise<void> {
    console.log("Iniciando sincrionizacion de visitantes oanel 1")
  // ===============================
  // Curl helper: devuelve status + body (NO revienta en 400/500)
  // ===============================
  const runCurl = (args: string[]) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const marker = "___HTTP_STATUS___";
      execFile(
        "curl",
        ["--silent", "--show-error", ...args, "-w", `\n${marker}%{http_code}`],
        { windowsHide: true, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
        (err, stdout, stderr) => {
          const out = String(stdout || "");
          const errText = String(stderr || "").trim();

          if (!out && err) return reject(new Error(errText || err.message));

          const idx = out.lastIndexOf(marker);
          if (idx < 0) {
            if (err) return reject(new Error([errText, out].filter(Boolean).join("\n") || err.message));
            return resolve({ status: 0, body: out.trim() });
          }

          const body = out.slice(0, idx).trim();
          const status = Number(out.slice(idx + marker.length).trim()) || 0;

          // Si fue error interno sin body, sí fallamos
          if (err && !body) return reject(new Error(errText || err.message));

          resolve({ status, body });
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

  const runCurlJson = async (args: string[]) => {
    const { status, body } = await runCurl(args);
    return { status, body, json: tryParseJson(body) };
  };

  // ===============================
  // Imagen base64 -> jpeg real
  // ===============================
  const saveBase64ToTemp = async (b64: string, employeeNo: string) => {
    const dir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const pure = b64.includes(",") ? (b64.split(",").pop() || "") : b64;
    const inputBuffer = Buffer.from(pure, "base64");

    const outBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();

    const filePath = path.join(dir, `img_${employeeNo}.jpg`);
    fs.writeFileSync(filePath, outBuffer);

    return { filePath, mime: "image/jpeg" as const };
  };

  // ===============================
  // ISAPI helpers
  // ===============================
  const userSearchByEmployeeNo = async (ip: string, user: string, pass: string, employeeNo: string) => {
    const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
    const payload = {
      UserInfoSearchCond: {
        searchID: "1",
        maxResults: 1,
        searchResultPosition: 0,
        EmployeeNoList: [{ employeeNo: String(employeeNo) }],
      },
    };

    return runCurlJson([
      "--digest",
      "-u",
      `${user}:${pass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      url,
      "-d",
      JSON.stringify(payload),
    ]);
  };

  const userCreate = async (
    ip: string,
    user: string,
    pass: string,
    employeeNo: string,
    name: string,
    beginTime: string,
    endTime: string
  ) => {
    // usa format=json1 si tu firmware lo prefiere; aquí dejo json (si quieres, lo cambiamos)
    const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;

    // Para visitantes, en muchos firmwares es más compatible "normal" + Valid
    const payload = {
      UserInfo: {
        employeeNo: String(employeeNo),
        name,
        userType: "normal",
        Valid: { enable: true, beginTime, endTime },
      },
    };

    return runCurlJson([
      "--digest",
      "-u",
      `${user}:${pass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      url,
      "-d",
      JSON.stringify(payload),
    ]);
  };

  const cardCreate = async (ip: string, user: string, pass: string, employeeNo: string, cardNo: string) => {
    const url = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
    const payload = {
      CardInfo: {
        employeeNo: String(employeeNo),
        cardNo: String(cardNo),
        cardType: "normalCard",
      },
    };

    return runCurlJson([
      "--digest",
      "-u",
      `${user}:${pass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      url,
      "-d",
      JSON.stringify(payload),
    ]);
  };

  const faceUpload = async (
    ip: string,
    user: string,
    pass: string,
    employeeNo: string,
    fpid: string,
    imagePath: string,
    mimeType: string
  ) => {
    const url = `http://${ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

    const faceRecord = {
      faceLibType: "blackFD",
      FDID: "1",
      FPID: String(fpid),
      employeeNo: String(employeeNo),
    };

    const imagePathCurl = imagePath.replace(/\\/g, "/");

    return runCurlJson([
      "--digest",
      "-u",
      `${user}:${pass}`,
      "-H",
      "Expect:",
      "-X",
      "POST",
      url,
      "-F",
      `FaceDataRecord=${JSON.stringify(faceRecord)}`,
      "-F",
      `img=@${imagePathCurl};type=${mimeType}`,
    ]);
  };

  const faceDelete = async (
    ip: string,
    user: string,
    pass: string,
    fpid: string
  ) => {
    const url = `http://${ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
    const payload = {
      faceLibType: "blackFD",
      FDID: "1",
      FPID: String(fpid),
      deleteFP: true,
    };

    return runCurlJson([
      "--digest",
      "-u",
      `${user}:${pass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "PUT",
      url,
      "-d",
      JSON.stringify(payload),
    ]);
  };

  // ===============================
  // Principal
  // ===============================
  try {
    const panelId = req.params.panelId;
    const visitanteId = req.params.visitanteId;

    console.log("[SYNC-VIS] inicio", { panelId, visitanteId });

    const panel = await DispositivosHv.findById(panelId).lean() as any;
    if (!panel) {
      res.status(200).json({ estado: false, mensaje: "Panel no encontrado." });
      return;
    }

    const visitante = await Visitantes.findById(visitanteId).lean() as any;
    if (!visitante) {
      res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
      return;
    }

    const ip = panel.direccion_ip;
    const hvUser = panel.usuario;
    const hvPass = decryptPassword(panel.contrasena, CONFIG.SECRET_CRYPTO);

    // ✅ ID correcto (NUMÉRICO) como en tu crear()
    const idVisit = Number(visitante.id_visitante);
    if (!Number.isFinite(idVisit)) {
      res.status(200).json({ estado: false, mensaje: "Visitante sin id_visitante numérico." });
      return;
    }

    const base = 990000;
    const employeeNo = String(base + idVisit);
    const cardNo = String(visitante.card_code || generarCardCodeDesdeId(idVisit));
    const fpid = employeeNo;

    const fullName =
      `${visitante.nombre ?? ""} ${visitante.apellido_pat ?? ""} ${visitante.apellido_mat ?? ""}`
        .replace(/\s+/g, " ")
        .trim() || `VISITANTE ${employeeNo}`;

    // Ventana de acceso (ajústala a tus campos reales si los tienes)
    const beginTime = (visitante.fecha_entrada
      ? dayjs(visitante.fecha_entrada)
      : dayjs()
    ).format("YYYY-MM-DDTHH:mm:ss");

    const endTime = (visitante.fecha_salida
      ? dayjs(visitante.fecha_salida)
      : dayjs(beginTime).add(12, "hour")
    ).format("YYYY-MM-DDTHH:mm:ss");

    // 1) Search usuario
    const searchRes = await userSearchByEmployeeNo(ip, hvUser, hvPass, employeeNo);
    const totalMatches = Number(searchRes.json?.UserInfoSearch?.totalMatches ?? 0);
    const exists = totalMatches > 0;

    let createdUser = false;
    let createdCard = false;
    let face: "OK" | "ALREADY_EXISTS" | "SKIPPED" | "ERROR" = "SKIPPED";

    // 2) Crear usuario si no existe
    if (!exists) {
      const createRes = await userCreate(ip, hvUser, hvPass, employeeNo, fullName, beginTime, endTime);
      createdUser = createRes.json?.statusString === "OK";
      if (!createdUser) {
        console.log("[SYNC-VIS] createUser resp", { status: createRes.status, json: createRes.json, body: createRes.body });
      }
    }

    // 3) Crear tarjeta SIEMPRE (aunque el usuario ya exista)
    const cardRes = await cardCreate(ip, hvUser, hvPass, employeeNo, cardNo);
    createdCard = cardRes.json?.statusString === "OK";
    if (!createdCard) {
      console.log("[SYNC-VIS] createCard resp", { status: cardRes.status, json: cardRes.json, body: cardRes.body });
    }

    // 4) Foto (si hay)
    if (visitante.img_usuario) {
      const { filePath, mime } = await saveBase64ToTemp(visitante.img_usuario, employeeNo);
      try {
        const faceRes = await faceUpload(ip, hvUser, hvPass, employeeNo, fpid, filePath, mime);

        if (faceRes.json?.statusString === "OK") {
          face = "OK";
        } else if (faceRes.json?.subStatusCode === "deviceUserAlreadyExistFace") {
          face = "ALREADY_EXISTS";
          const delRes = await faceDelete(ip, hvUser, hvPass, fpid);
          if (delRes.json?.statusString === "OK") {
            const faceRetry = await faceUpload(ip, hvUser, hvPass, employeeNo, fpid, filePath, mime);
            if (faceRetry.json?.statusString === "OK") {
              face = "OK";
            } else {
              face = "ERROR";
              console.log("[SYNC-VIS] face retry resp", { status: faceRetry.status, json: faceRetry.json, body: faceRetry.body });
            }
          }
        } else {
          face = "ERROR";
          console.log("[SYNC-VIS] face resp", { status: faceRes.status, json: faceRes.json, body: faceRes.body });
        }
      } finally {
        await safeUnlink(filePath);
      }
    }

    res.status(200).json({
      estado: true,
      datos: {
        panel: ip,
        visitante: {
          _id: String(visitante._id),
          id_visitante: visitante.id_visitante,
          employeeNo,
        cardNo,
          fpid,
          nombre: fullName,
          beginTime,
          endTime,
        },
        exists,
        createdUser,
        createdCard,
        face,
      },
      mensaje: "Visitante sincronizado (ID numérico 990000 + id_visitante).",
    });
  } catch (e: any) {
    console.log("[SYNC-VIS] ERROR:", String(e?.message || e));
    res.status(500).json({ estado: false, mensaje: String(e?.message || e) });
  }
}


// Ajusta imports reales
// import { DispositivosHv } from "../models/DispositivosHv";
// import { Visitantes } from "../models/Visitantes";
// import { decryptPassword } from "../utils/crypto";
// import { CONFIG } from "../config";

// =====================================================
// HELPERS (curl + json) — estilo crear()
// =====================================================
const tryParseJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const generarCardCodeDesdeId = (id_visitante: number): string => {
  const base36 = id_visitante.toString(36).toUpperCase().padStart(6, "0");
  const hash = crypto
    .createHash("sha256")
    .update(String(id_visitante))
    .digest("hex")
    .toUpperCase()
    .slice(0, 10);
  return `VST${base36}${hash}`;
};

const runCurl = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      args,
      { windowsHide: true, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const out = String(stdout || "").trim();
        const errText = String(stderr || "").trim();

        if (err) {
          // con --fail-with-body normalmente `out` trae el body del 400
          return reject(new Error(out || errText || err.message));
        }
        if (!out) return reject(new Error(errText || "Respuesta vacía de curl"));
        resolve(out);
      }
    );
  });
};

// =====================================================
// HELPER: sube 1 visitante al panel con el flow EXACTO
//         de tu crear(): user A/B -> search -> card -> face
// =====================================================
async function syncVisitanteLikeCrear(params: {
  ip: string;
  hvUser: string;
  hvPass: string;
  employeeNo: string;
  cardNo: string;
  fullName: string;
  beginTime: string;
  endTime: string;
  imgBase64?: string;
}) {
  const { ip, hvUser, hvPass, employeeNo, cardNo, fullName, beginTime, endTime, imgBase64 } = params;

  // ---------- Crear usuario (A / B) ----------
  const urlUser = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;

  const payloadA = {
    UserInfo: {
      employeeNo,
      name: fullName || `Invitado ${employeeNo}`,
      userType: "visitor",
      userVerifyMode: "faceOrFpOrCardOrPw",
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

  try {
    const outA = await runCurl([
      "--silent",
      "--show-error",
      "--fail-with-body",
      "--digest",
      "-u",
      `${hvUser}:${hvPass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      urlUser,
      "-d",
      JSON.stringify(payloadA),
    ]);
    // console.log("[HV] User create A:", ip, outA.slice(0, 200));
  } catch (e: any) {
    // console.log("[HV] User create A FALLÓ -> fallback B:", ip, String(e?.message || e).slice(0, 200));
    const outB = await runCurl([
      "--silent",
      "--show-error",
      "--fail-with-body",
      "--digest",
      "-u",
      `${hvUser}:${hvPass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      urlUser,
      "-d",
      JSON.stringify(payloadB),
    ]);
    // console.log("[HV] User create B:", ip, outB.slice(0, 200));
  }

  // ---------- Confirmar con Search ----------
  const urlSearch = `http://${ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
  const searchOut = await runCurl([
    "--silent",
    "--show-error",
    "--fail-with-body",
    "--digest",
    "-u",
    `${hvUser}:${hvPass}`,
    "-H",
    "Content-Type: application/json",
    "-X",
    "POST",
    urlSearch,
    "-d",
    JSON.stringify({
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

  if (totalMatches === 0) {
    return { ok: false, step: "searchConfirm", msg: "No confirmó usuario; se omite tarjeta y face." };
  }

  // ---------- Crear tarjeta ----------
  const urlCard = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
  try {
    await runCurl([
      "--silent",
      "--show-error",
      "--fail-with-body",
      "--digest",
      "-u",
      `${hvUser}:${hvPass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      urlCard,
      "-d",
      JSON.stringify({ CardInfo: { employeeNo, cardNo, cardType: "normalCard" } }),
    ]);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!msg.includes("cardNoAlreadyExist")) throw e; // si ya existe, lo damos por OK
  }

  // ---------- Foto ----------
  if (imgBase64) {
    try {
      const tempDir = path.resolve(process.cwd(), "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const base64 = String(imgBase64).split(",").pop() || "";
      const inputBuffer = Buffer.from(base64, "base64");

      const outBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:2:0" })
        .toBuffer();

      const imgPath = path.join(tempDir, `img_${employeeNo}.jpg`);
      fs.writeFileSync(imgPath, outBuffer);

      const urlFace = `http://${ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;
      const faceRecord = { faceLibType: "blackFD", FDID: "1", FPID: employeeNo, employeeNo };

      try {
        await runCurl([
          "--silent",
          "--show-error",
          "--fail-with-body",
          "--digest",
          "-u",
          `${hvUser}:${hvPass}`,
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
      } finally {
        await safeUnlink(imgPath);
      }
    } catch (e: any) {
      // no hacemos fallar toda la sync si solo falla cara
      return { ok: true, step: "done", face: "ERROR", faceMsg: String(e?.message || e).slice(0, 500) };
    }
  }

  return { ok: true, step: "done", face: imgBase64 ? "OK" : "SKIPPED" };
}

// =====================================================
// HELPER: listar TODOS los employeeNo del panel (paginado)
// =====================================================
async function listarEmployeeNosEnPanel(params: { ip: string; hvUser: string; hvPass: string }) {
  const { ip, hvUser, hvPass } = params;

  const urlSearch = `http://${ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;

  const maxResults = 50;
  let pos = 0;
  let total = Infinity;

  const employeeNos: string[] = [];

  while (pos < total) {
    const payload = {
      UserInfoSearchCond: {
        searchID: "1",
        maxResults,
        searchResultPosition: pos,
        // IMPORTANTE: no mandamos EmployeeNoList para que liste todo
      },
    };

    const out = await runCurl([
      "--silent",
      "--show-error",
      "--fail-with-body",
      "--digest",
      "-u",
      `${hvUser}:${hvPass}`,
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      urlSearch,
      "-d",
      JSON.stringify(payload),
    ]);

    const j = tryParseJson(out);
    const search = j?.UserInfoSearch;

    const pageTotal = Number(search?.totalMatches ?? 0);
    if (!Number.isFinite(pageTotal)) break;

    total = pageTotal;

    const list = Array.isArray(search?.UserInfo) ? search.UserInfo : [];
    for (const u of list) {
      const emp = String(u?.employeeNo ?? "").trim();
      if (emp) employeeNos.push(emp);
    }

    pos += maxResults;

    // seguridad: evita loops raros si el panel responde mal
    if (maxResults <= 0) break;
    if (employeeNos.length > 20000) break;
  }

  return employeeNos;
}

// =====================================================
// UTIL: detectar si employeeNo es “visitante” (29000+)
// =====================================================
function isVisitorEmployeeNo(emp: string) {
  if (!/^\d+$/.test(emp)) return false;
  const n = Number(emp);
  return Number.isFinite(n) && n >= 29000 && n < 40000; // rango seguro (ajusta si usas más)
}

function visitorIdFromEmployeeNo(emp: string) {
  const n = Number(emp);
  if (!Number.isFinite(n)) return NaN;
  return n - 29000;
}

// =====================================================
// FUNCIÓN PRINCIPAL: sincronizarPanel (diff base vs panel)
// =====================================================
/*
export async function sincronizarPanel(req: Request, res: Response): Promise<void> {
  const panelId = String(req.params.id || req.params.panelId || "");
  console.log("[SYNC-PANEL] inicio", { panelId });

  try {
    const panel = (await DispositivosHv.findById(panelId).lean()) as any;
    if (!panel) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
      return;
    }

    const ip = panel.direccion_ip;
    const hvUser = panel.usuario;
    const hvPass = decryptPassword(panel.contrasena, CONFIG.SECRET_CRYPTO);

    // =====================================================
    // 1) BASE: visitantes que “deberían estar”
    //    AJUSTA ESTE FIND A TU REGLA REAL:
    //    - por ejemplo: { activo: true }
    //    - o por fecha: fecha_entrada hoy, etc.
    // =====================================================
    const visitantesBase = await Visitantes.find(
    {},
    { id_visitante: 1, nombre: 1, apellido_pat: 1, apellido_mat: 1, img_usuario: 1 }
    ).lean();


    const baseSet = new Set<string>();
    const baseMap = new Map<string, any>(); // employeeNo -> visitante
    for (const v of visitantesBase as any[]) {
      const idv = Number(v.id_visitante);
      if (!Number.isFinite(idv)) continue;

      const emp = String(29000 + idv);
      baseSet.add(emp);
      baseMap.set(emp, v);
    }

    // =====================================================
    // 2) PANEL: listar employeeNo existentes
    // =====================================================
    const panelEmployeeNos = await listarEmployeeNosEnPanel({ ip, hvUser, hvPass });
    const panelVisitors = panelEmployeeNos.filter(isVisitorEmployeeNo);
    const panelSet = new Set(panelVisitors);

    // =====================================================
    // 3) DIFF
    //    faltanEnPanel = en base pero NO en panel (los que tú quieres subir)
    //    sobranEnPanel = en panel pero NO en base (por si lo quieres reportar)
    // =====================================================
    const faltanEnPanel = [...baseSet].filter((emp) => !panelSet.has(emp));
    const sobranEnPanel = [...panelSet].filter((emp) => !baseSet.has(emp));

    console.log("[SYNC-PANEL] conteos", {
      base: baseSet.size,
      panelVisitors: panelSet.size,
      faltanEnPanel: faltanEnPanel.length,
      sobranEnPanel: sobranEnPanel.length,
    });

    // =====================================================
    // 4) SUBIR FALTANTES (con el curl “bueno”)
    // =====================================================
    const beginTime = dayjs().format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().format("YYYY-MM-DDT23:59:59");

    let subidos = 0;
    let fallidos = 0;
    const errores: Array<{ employeeNo: string; id_visitante: number; error: string }> = [];

    for (const employeeNo of faltanEnPanel) {
      const v = baseMap.get(employeeNo);
      const id_visitante = Number(v?.id_visitante);

      const fullName =
        `${v?.nombre ?? ""} ${v?.apellido_pat ?? ""} ${v?.apellido_mat ?? ""}`.replace(/\s+/g, " ").trim() ||
        `Invitado ${employeeNo}`;

      try {
        const r = await syncVisitanteLikeCrear({
          ip,
          hvUser,
          hvPass,
          employeeNo,
          cardNo: employeeNo,
          fullName,
          beginTime,
          endTime,
          imgBase64: v?.img_usuario || undefined,
        });

        if (r.ok) subidos++;
        else {
          fallidos++;
          errores.push({
            employeeNo,
            id_visitante,
            error: `${r.step}: ${r.msg ?? "falló"}`,
          });
        }
      } catch (e: any) {
        fallidos++;
        errores.push({
          employeeNo,
          id_visitante,
          error: String(e?.message || e).slice(0, 500),
        });
      }
    }

    // =====================================================
    // 5) RESPUESTA
    // =====================================================
    res.status(200).json({
      estado: true,
      datos: {
        panel: ip,
        base: {
          total_visitantes_base: visitantesBase.length,
          total_employeeNos_base: baseSet.size,
        },
        panel_stats: {
          total_employeeNos_panel: panelEmployeeNos.length,
          total_visitantes_panel: panelSet.size,
        },
        diff: {
          faltanEnPanel: faltanEnPanel.length,
          sobranEnPanel: sobranEnPanel.length,
          // si quieres ver cuáles son:
          // faltanEnPanel,
          // sobranEnPanel,
          faltan_id_visitante: faltanEnPanel.map((emp) => visitorIdFromEmployeeNo(emp)).filter((n) => Number.isFinite(n)),
        },
        sync: {
          subidos,
          fallidos,
          errores: errores.slice(0, 50), // evita respuestas gigantes
        },
      },
      mensaje: "Sync: compara base vs panel y sube los que faltan en el panel.",
    });
  } catch (e: any) {
    console.log("[SYNC-PANEL] ERROR:", String(e?.message || e));
    res.status(500).json({ estado: false, mensaje: String(e?.message || e) });
  }
}


*/


export async function sincronizarPanel(req: Request, res: Response): Promise<void> {
  console.log("[SYNC-PANEL] inicio", { panelId: req.params.id });

  // ============================================================
  // Helpers internos: curl + JSON (del primer código, igual idea)
  // ============================================================
  const runCurl = (args: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      execFile(
        "curl",
        args,
        { windowsHide: true, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
        (err, stdout, stderr) => {
          const out = (stdout || "").trim();
          const errText = (stderr || "").trim();
          if (err) return reject(new Error(errText || err.message));
          if (!out) return reject(new Error("Respuesta vacía de curl"));
          resolve(out);
        }
      );
    });
  };

  const runCurlJson = async (args: string[]): Promise<any> => {
    const out = await runCurl(args);
    try {
      return JSON.parse(out);
    } catch {
      return out;
    }
  };

  // Normaliza base64 "data:image/jpeg;base64,xxxx" a puro base64
  const normalizeBase64 = (b64: string) => {
    if (!b64) return "";
    const idx = b64.indexOf("base64,");
    return idx >= 0 ? b64.slice(idx + "base64,".length) : b64;
  };

  // Convierte base64 a JPEG real con sharp y lo guarda en temp
  const saveBase64ToTemp = async (b64: string, employeeNo: string) => {
    const dir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const pure = b64.includes(",") ? (b64.split(",").pop() || "") : b64;
    const inputBuffer = Buffer.from(pure, "base64");

    const outBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 90,
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
      })
      .toBuffer();

    const filePath = path.join(dir, `img_${employeeNo}.jpg`);
    fs.writeFileSync(filePath, outBuffer);

    return { filePath, mime: "image/jpeg" as const };
  };

  // ============================================================
  // ISAPI helpers (del primer código)
  // ============================================================
  const userSearchByEmployeeNo = async (ip: string, usuario: string, pass: string, employeeNo: string) => {
    const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
    const payload = {
      UserInfoSearchCond: {
        searchID: "1",
        maxResults: 1,
        searchResultPosition: 0,
        EmployeeNoList: [{ employeeNo: String(employeeNo) }],
      },
    };

    const args = [
      "--silent",
      "--show-error",
      "--digest",
      "-u",
      `${usuario}:${pass}`,
      "-X",
      "POST",
      url,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify(payload),
    ];

    return runCurlJson(args);
  };

  const userCreate = async (
    ip: string,
    usuario: string,
    pass: string,
    data: { employeeNo: string; name: string; userType: "normal" | "blackList"; beginTime: string; endTime: string }
  ) => {
    const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;

    const payload = {
      UserInfo: {
        employeeNo: String(data.employeeNo),
        name: data.name,
        userType: data.userType,
        localUIRight: false,
        Valid: {
          enable: true,
          beginTime: data.beginTime,
          endTime: data.endTime,
          timeType: "local",
        },
        doorRight: "1",
        RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
        userVerifyMode: "",
      },
    };

    const args = [
      "--silent",
      "--show-error",
      "--digest",
      "-u",
      `${usuario}:${pass}`,
      "-X",
      "POST",
      url,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify(payload),
    ];

    return runCurlJson(args);
  };

  const cardCreate = async (ip: string, usuario: string, pass: string, employeeNo: string, cardNo: string) => {
    const url = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;

    const payload = {
      CardInfo: {
        employeeNo: String(employeeNo),
        cardNo: String(cardNo),
        cardType: "normalCard",
      },
    };

    const args = [
      "--silent",
      "--show-error",
      "--digest",
      "-u",
      `${usuario}:${pass}`,
      "-X",
      "POST",
      url,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify(payload),
    ];

    return runCurlJson(args);
  };

  const faceUpload = async (
    ip: string,
    usuario: string,
    pass: string,
    employeeNo: string,
    fpid: string,
    imagePath: string,
    mimeType: string
  ) => {
    const url = `http://${ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

    const faceRecord = {
      faceLibType: "blackFD",
      FDID: "1",
      FPID: String(fpid),
      employeeNo: String(employeeNo),
    };

    const imagePathCurl = imagePath.replace(/\\/g, "/");

    const args = [
      "--silent",
      "--show-error",
      "--digest",
      "-u",
      `${usuario}:${pass}`,
      "-X",
      "POST",
      url,
      "-H",
      "Expect:",
      "-F",
      `FaceDataRecord=${JSON.stringify(faceRecord)}`,
      "-F",
      `img=@${imagePathCurl};type=${mimeType}`,
    ];

    return runCurlJson(args);
  };

  // ============================================================
  // Subrutina A: sincroniza USUARIOS por acceso (primer código)
  // ============================================================
  const syncUsuariosPorAcceso = async (panel: any, decrypted_pass: string) => {
    const { tipo_evento, id_acceso, direccion_ip, usuario } = panel;

    if (tipo_evento === 0) {
      return {
        skipped: true,
        reason: "tipo_evento=0 (modo seguro): no se borra nada en esta versión autocontenida.",
        stats: { usuarios_creados: 0, tarjetas_creadas: 0, fotos_subidas: 0, fallidos: 0 },
      };
    }

    const usuariosMDB_raw = await Usuarios.find(
      { accesos: { $in: [id_acceso] } },
      { img_usuario: 1, id_general: 1, nombre: 1, apellido_pat: 1, apellido_mat: 1, activo: 1, fecha_creacion: 1 }
    ).lean();

    const usuariosMDB = (usuariosMDB_raw as any[]).map((u: any) => ({
      img_usuario: u.img_usuario,
      id_general: u.id_general,
      nombre: `${u.nombre ?? ""} ${u.apellido_pat ?? ""} ${u.apellido_mat ?? ""}`.trim(),
      activo: !!u.activo,
      fecha_creacion: u.fecha_creacion,
    }));

    console.log("[SYNC-PANEL][USUARIOS] usuarios a sincronizar:", usuariosMDB.length);

    let user_created = 0;
    let card_created = 0;
    let img_created = 0;
    let failed = 0;

    for (const registro of usuariosMDB) {
      const employeeNo = String(registro.id_general);

      try {
        const searchRes = await userSearchByEmployeeNo(direccion_ip, usuario, decrypted_pass, employeeNo);
        const totalMatches = Number(searchRes?.UserInfoSearch?.totalMatches ?? 0);

        if (totalMatches === 0) {
          const beginTime = registro.fecha_creacion
            ? dayjs(registro.fecha_creacion).format("YYYY-MM-DDTHH:mm:ss")
            : dayjs().format("YYYY-MM-DDTHH:mm:ss");

          const createRes = await userCreate(direccion_ip, usuario, decrypted_pass, {
            employeeNo,
            name: registro.nombre || `EMP ${employeeNo}`,
            userType: registro.activo ? "normal" : "blackList",
            beginTime,
            endTime: "2037-12-31T23:59:59",
          });

          if (typeof createRes === "string") {
            console.log("[SYNC-PANEL][USUARIOS] User create text:", createRes);
          } else {
            if (createRes?.statusString === "OK") user_created++;
            else console.log("[SYNC-PANEL][USUARIOS] User create error json:", createRes);
          }

          const cardRes = await cardCreate(direccion_ip, usuario, decrypted_pass, employeeNo, employeeNo);
          if (typeof cardRes === "string") {
            console.log("[SYNC-PANEL][USUARIOS] Card create text:", cardRes);
          } else {
            if (cardRes?.statusString === "OK") card_created++;
            else console.log("[SYNC-PANEL][USUARIOS] Card create error json:", cardRes);
          }

          if (registro.activo && registro.img_usuario) {
            const { filePath, mime } = await saveBase64ToTemp(normalizeBase64(registro.img_usuario), employeeNo);

            try {
              console.log("[SYNC-PANEL][USUARIOS] Subiendo foto:", {
                employeeNo,
                filePath,
                mime,
                existe: fs.existsSync(filePath),
              });

              const faceRes = await faceUpload(direccion_ip, usuario, decrypted_pass, employeeNo, employeeNo, filePath, mime);
              console.log("[SYNC-PANEL][USUARIOS] Respuesta FaceDataRecord:", faceRes);

              if (typeof faceRes !== "string" && faceRes?.statusString === "OK") img_created++;
            } finally {
              await safeUnlink(filePath);
            }
          }
        } else {
          // Modo simple: existe -> no actualiza
        }
      } catch (err: any) {
        failed++;
        console.log("[SYNC-PANEL][USUARIOS] Falló usuario:", employeeNo, err?.message || err);
      }
    }

    return {
      skipped: false,
      stats: { usuarios_creados: user_created, tarjetas_creadas: card_created, fotos_subidas: img_created, fallidos: failed },
    };
  };

  // ============================================================
  // Subrutina B: sincroniza VISITANTES base vs panel (segundo código)
  // (usa tus helpers ya existentes: listarEmployeeNosEnPanel, etc.)
  // ============================================================
  const syncVisitantesBaseVsPanel = async (ip: string, hvUser: string, hvPass: string) => {
    const visitantesBase = await Visitantes.find(
      {},
      { id_visitante: 1, nombre: 1, apellido_pat: 1, apellido_mat: 1, img_usuario: 1 }
    ).lean();

    const baseSet = new Set<string>();
    const baseMap = new Map<string, any>();
    for (const v of visitantesBase as any[]) {
      const idv = Number(v.id_visitante);
      if (!Number.isFinite(idv)) continue;

      const emp = String(29000 + idv);
      baseSet.add(emp);
      baseMap.set(emp, v);
    }

    const panelEmployeeNos = await listarEmployeeNosEnPanel({ ip, hvUser, hvPass });
    const panelVisitors = (panelEmployeeNos as string[]).filter(isVisitorEmployeeNo);
    const panelSet = new Set(panelVisitors);

    const faltanEnPanel = [...baseSet].filter((emp) => !panelSet.has(emp));
    const sobranEnPanel = [...panelSet].filter((emp) => !baseSet.has(emp));

    console.log("[SYNC-PANEL][VISITANTES] conteos", {
      base: baseSet.size,
      panelVisitors: panelSet.size,
      faltanEnPanel: faltanEnPanel.length,
      sobranEnPanel: sobranEnPanel.length,
    });

    const beginTime = dayjs().format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().format("YYYY-MM-DDT23:59:59");

    let subidos = 0;
    let fallidos = 0;
    const errores: Array<{ employeeNo: string; id_visitante: number; error: string }> = [];

    for (const employeeNo of faltanEnPanel) {
      const v = baseMap.get(employeeNo);
      const id_visitante = Number(v?.id_visitante);

      const fullName =
        `${v?.nombre ?? ""} ${v?.apellido_pat ?? ""} ${v?.apellido_mat ?? ""}`.replace(/\s+/g, " ").trim() ||
        `Invitado ${employeeNo}`;

      try {
        const r = await syncVisitanteLikeCrear({
          ip,
          hvUser,
          hvPass,
          employeeNo,
          cardNo: employeeNo,
          fullName,
          beginTime,
          endTime,
          imgBase64: v?.img_usuario || undefined,
        });

        if (r.ok) subidos++;
        else {
          fallidos++;
          errores.push({
            employeeNo,
            id_visitante,
            error: `${r.step}: ${r.msg ?? "falló"}`,
          });
        }
      } catch (e: any) {
        fallidos++;
        errores.push({
          employeeNo,
          id_visitante,
          error: String(e?.message || e).slice(0, 500),
        });
      }
    }

    return {
      base: { total_visitantes_base: (visitantesBase as any[]).length, total_employeeNos_base: baseSet.size },
      panel_stats: { total_employeeNos_panel: (panelEmployeeNos as any[]).length, total_visitantes_panel: panelSet.size },
      diff: {
        faltanEnPanel: faltanEnPanel.length,
        sobranEnPanel: sobranEnPanel.length,
        faltan_id_visitante: faltanEnPanel
          .map((emp) => visitorIdFromEmployeeNo(emp))
          .filter((n) => Number.isFinite(n)),
      },
      sync: { subidos, fallidos, errores: errores.slice(0, 50) },
    };
  };

  // ============================================================
  // EJECUCIÓN principal (una sola función que hace ambas)
  // ============================================================
  try {
    const panelId = String(req.params.id || "");
    const panel = (await DispositivosHv.findById(panelId).lean()) as any;

    if (!panel) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo no encontrado." });
      return;
    }

    const ip = panel.direccion_ip;
    const hvUser = panel.usuario;
    const hvPass = decryptPassword(panel.contrasena, CONFIG.SECRET_CRYPTO);

    console.log("[SYNC-PANEL] PANEL IP:", ip);

    // 1) Usuarios por acceso (primer flujo)
    const usuariosResult = await syncUsuariosPorAcceso(panel, hvPass);

    // 2) Visitantes base vs panel (segundo flujo)
    const visitantesResult = await syncVisitantesBaseVsPanel(ip, hvUser, hvPass);

    res.status(200).json({
      estado: true,
      datos: {
        panel: ip,
        usuarios_por_acceso: usuariosResult,
        visitantes_base_vs_panel: visitantesResult,
      },
      mensaje: "Sincronización unificada: (A) usuarios por acceso + (B) visitantes base vs panel.",
    });
  } catch (e: any) {
    console.log("[SYNC-PANEL] ERROR:", String(e?.message || e));
    res.status(500).json({ estado: false, mensaje: String(e?.message || e) });
  }
}
