import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { DecodedTokenUser } from "../types/jsonwebtoken";
import DispositivosBiostar from "../models/DispositivosBiostar";
import BiostarConexion from "../models/BiostarConexion";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, decryptPassword, encryptPassword, isEmptyObject } from "../utils/utils";
import { QueryParams } from "../types/queryparams";
import { CONFIG } from "../config";
import { validarModelo } from "../validators/validadores";
import { probarConexionBiostar, biostarRequest } from "../classes/Biostar";

function parseBiostarDevices(payload: any): Array<{ nombre: string; direccion_ip: string; puerto: number; usuario: string; contrasena: string }> {
  const candidateCollections = [
    payload?.DeviceCollection?.rows,
    payload?.DeviceCollection?.devices,
    payload?.devices,
    payload?.rows,
    payload?.data?.devices,
  ];
  const rows = candidateCollections.find((item) => Array.isArray(item)) || [];

  return rows
    .map((item: any) => {
      const nombre = String(item?.name || item?.device_name || item?.id || "").trim();
      const direccion_ip = String(item?.ip_address || item?.ip || "").trim();
      const puertoRaw = Number(item?.port || item?.server_port || CONFIG.BIOSTAR_PORT);
      const puerto = Number.isFinite(puertoRaw) ? puertoRaw : CONFIG.BIOSTAR_PORT;
      if (!nombre || !direccion_ip) return null;
      return { nombre, direccion_ip, puerto, usuario: "", contrasena: "" };
    })
    .filter(Boolean) as Array<{ nombre: string; direccion_ip: string; puerto: number; usuario: string; contrasena: string }>;
}

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
  try {
    const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string };
    const queryFilter = JSON.parse(filter) as QueryParams["filter"];
    const querySort = JSON.parse(sort) as QueryParams["sort"];
    const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

    const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } = customAggregationForDataGrids(
      queryFilter,
      querySort,
      queryPagination,
      ["nombre", "direccion_ip", "usuario"]
    );

    const aggregation: PipelineStage[] = [];
    if (filterMDB.length > 0) {
      aggregation.push({ $match: { $or: filterMDB } });
    }

    aggregation.push(
      {
        $project: {
          nombre: 1,
          direccion_ip: 1,
          puerto: 1,
          usuario: 1,
          activo: 1,
          es_main: 1,
          session_activa: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$session_id", false] },
                  { $gt: ["$session_expira", new Date()] },
                ],
              },
              true,
              false,
            ],
          },
        },
      },
      { $sort: sortMDB || { nombre: 1 } },
      {
        $facet: {
          paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
          totalCount: [{ $count: "count" }],
        },
      }
    );

    const registros = await DispositivosBiostar.aggregate(aggregation);
    res.status(200).json({ estado: true, datos: registros[0] });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function obtenerUno(req: Request, res: Response): Promise<void> {
  try {
    const registro = await DispositivosBiostar.aggregate([
      { $match: { _id: new Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "usuarios",
          localField: "creado_por",
          foreignField: "_id",
          as: "creado_por",
          pipeline: [{ $project: { nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] } } }],
        },
      },
      {
        $lookup: {
          from: "usuarios",
          localField: "modificado_por",
          foreignField: "_id",
          as: "modificado_por",
          pipeline: [{ $project: { nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] } } }],
        },
      },
      {
        $set: {
          creado_por: { $arrayElemAt: ["$creado_por", 0] },
          modificado_por: { $arrayElemAt: ["$modificado_por", 0] },
        },
      },
      {
        $set: {
          creado_por: "$creado_por.nombre",
          modificado_por: "$modificado_por.nombre",
        },
      },
      { $project: { contrasena: 0, session_id: 0 } },
    ]);

    if (!registro[0]) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }

    res.status(200).json({ estado: true, datos: registro[0] });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function obtenerUnoFormEditar(req: Request, res: Response): Promise<void> {
  try {
    const registro = await DispositivosBiostar.findById(req.params.id);
    if (!registro) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }

    const datos = registro.toObject();
    const contrasena = decryptPassword(datos.contrasena, CONFIG.SECRET_CRYPTO);

    res.status(200).json({
      estado: true,
      datos: {
        ...datos,
        contrasena,
        session_id: undefined,
      },
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, direccion_ip, puerto, usuario, contrasena } = req.body;
    const creado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;

    const hasMain = await DispositivosBiostar.exists({ es_main: true, activo: true });
    const nuevoRegistro = new DispositivosBiostar({
      nombre,
      direccion_ip,
      puerto: Number(puerto) || CONFIG.BIOSTAR_PORT,
      usuario,
      contrasena,
      es_main: !hasMain,
      creado_por: creado_porID.id,
      fecha_creacion: Date.now(),
    });

    const mensajes = await validarModelo(nuevoRegistro);
    if (!isEmptyObject(mensajes)) {
      res.status(400).json({
        estado: false,
        mensaje: "Revisa que los datos que estas ingresando sean correctos.",
        mensajes,
      });
      return;
    }

    await nuevoRegistro.save();

    // Al crear, intentar dejar una sesion activa desde el inicio.
    await probarConexionBiostar(nuevoRegistro);

    res.status(200).json({ estado: true });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function modificar(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, direccion_ip, puerto, usuario, contrasena } = req.body;
    const modificado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;

    const registroActual = await DispositivosBiostar.findById(req.params.id);
    if (!registroActual) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }

    const update: Record<string, unknown> = {
      nombre,
      direccion_ip,
      puerto: Number(puerto) || CONFIG.BIOSTAR_PORT,
      usuario,
      modificado_por: modificado_porID.id,
      fecha_modificacion: Date.now(),
      session_id: "",
      session_expira: null,
    };

    if (typeof contrasena === "string" && contrasena.trim()) {
      update.contrasena = encryptPassword(contrasena.trim(), CONFIG.SECRET_CRYPTO);
    }

    const result = await DispositivosBiostar.updateOne({ _id: req.params.id }, { $set: update }, { runValidators: true });
    if (!result.matchedCount) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }

    res.status(200).json({ estado: true });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function modificarEstado(req: Request, res: Response): Promise<void> {
  try {
    const { activo } = req.body;
    const registro = await DispositivosBiostar.findByIdAndUpdate(req.params.id, {
      $set: {
        activo: !activo,
        session_id: "",
        session_expira: null,
      },
    });

    if (!registro) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }

    if (registro.es_main && registro.activo && activo) {
      const siguienteMain = await DispositivosBiostar.findOne({ _id: { $ne: registro._id }, activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1 });
      if (siguienteMain) {
        await DispositivosBiostar.updateOne({ _id: siguienteMain._id }, { $set: { es_main: true } });
      }
      await DispositivosBiostar.updateOne({ _id: registro._id }, { $set: { es_main: false } });
    }

    res.status(200).json({ estado: true });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function eliminar(req: Request, res: Response): Promise<void> {
  try {
    const registro = await DispositivosBiostar.findById(req.params.id);
    if (!registro) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }

    const eraMain = !!registro.es_main;
    await DispositivosBiostar.deleteOne({ _id: req.params.id });

    if (eraMain) {
      const siguienteMain = await DispositivosBiostar.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1 });
      if (siguienteMain) {
        await DispositivosBiostar.updateOne({ _id: siguienteMain._id }, { $set: { es_main: true } });
      }
    }

    res.status(200).json({ estado: true, mensaje: "Dispositivo eliminado correctamente." });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

function parseRemoteDeviceRows(payload: any): any[] {
  const candidates = [
    payload?.DeviceCollection?.rows,
    payload?.DeviceCollection?.devices,
    payload?.device_collection?.rows,
    payload?.devices,
    payload?.rows,
    payload?.records,
  ];
  const rows = candidates.find((value) => Array.isArray(value)) || [];
  return rows;
}

async function getBiostarConexionActiva(): Promise<any | null> {
  const conexion = await BiostarConexion.findOne({ activo: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });
  return conexion || null;
}

export async function establecerMain(req: Request, res: Response): Promise<void> {
  try {
    const registro = await DispositivosBiostar.findById(req.params.id);
    if (!registro) {
      res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
      return;
    }
    if (!registro.activo) {
      res.status(200).json({ estado: false, mensaje: "Solo conexiones activas pueden ser main." });
      return;
    }

    await DispositivosBiostar.updateMany({}, { $set: { es_main: false } });
    await DispositivosBiostar.updateOne(
      { _id: registro._id },
      { $set: { es_main: true, fecha_modificacion: Date.now() } }
    );

    res.status(200).json({ estado: true, mensaje: "Conexion principal actualizada." });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function obtenerConexionGlobal(_req: Request, res: Response): Promise<void> {
  try {
    const registro = await BiostarConexion.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (!registro) {
      res.status(200).json({ estado: true, datos: null });
      return;
    }

    const datos = registro.toObject();
    res.status(200).json({
      estado: true,
      datos: {
        _id: datos._id,
        nombre: datos.nombre,
        direccion_ip: datos.direccion_ip,
        puerto: datos.puerto,
        usuario: datos.usuario,
        session_activa: !!(datos.session_id && datos.session_expira && new Date(datos.session_expira).getTime() > Date.now()),
      },
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function guardarConexionGlobal(req: Request, res: Response): Promise<void> {
  try {
    const { direccion_ip, puerto, usuario, contrasena } = req.body;
    const existente = await BiostarConexion.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });

    if (!existente) {
      const nuevo = new BiostarConexion({
        nombre: "Conexion Global BioStar",
        direccion_ip,
        puerto: Number(puerto) || CONFIG.BIOSTAR_PORT,
        usuario,
        contrasena,
      });
      await nuevo.save();
      res.status(200).json({ estado: true });
      return;
    }

    const update: Record<string, unknown> = {
      direccion_ip,
      puerto: Number(puerto) || CONFIG.BIOSTAR_PORT,
      usuario,
      fecha_modificacion: Date.now(),
      session_id: "",
      session_expira: null,
    };
    if (typeof contrasena === "string" && contrasena.trim()) {
      update.contrasena = encryptPassword(contrasena.trim(), CONFIG.SECRET_CRYPTO);
    }

    await BiostarConexion.updateOne({ _id: existente._id }, { $set: update }, { runValidators: true });
    res.status(200).json({ estado: true });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function probarConexionGlobal(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await BiostarConexion.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const result = await probarConexionBiostar(conexion as any);
    if (!result.ok) {
      res.status(200).json({ estado: false, mensaje: result.message });
      return;
    }

    const ping = await biostarRequest(conexion as any, { method: "GET", url: "/api/user_groups" });
    if (!ping.ok) {
      res.status(200).json({ estado: false, mensaje: ping.message || "Conectado, pero fallo consulta de prueba." });
      return;
    }

    res.status(200).json({ estado: true, mensaje: "Conexion global establecida correctamente." });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function sincronizarDispositivos(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await BiostarConexion.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const devicesResult = await biostarRequest(conexion as any, { method: "GET", url: "/api/devices?limit=1000" });
    if (!devicesResult.ok) {
      res.status(200).json({ estado: false, mensaje: devicesResult.message || "No se pudo consultar dispositivos en BioStar." });
      return;
    }

    const devices = parseBiostarDevices(devicesResult.data);
    if (devices.length === 0) {
      res.status(200).json({ estado: false, mensaje: "No se encontraron dispositivos en BioStar." });
      return;
    }

    let creados = 0;
    let actualizados = 0;
    for (const device of devices) {
      const existente = await DispositivosBiostar.findOne({ direccion_ip: device.direccion_ip });
      if (!existente) {
        const nuevo = new DispositivosBiostar({
          nombre: device.nombre,
          direccion_ip: device.direccion_ip,
          puerto: device.puerto || CONFIG.BIOSTAR_PORT,
          usuario: conexion.usuario,
          contrasena: decryptPassword(conexion.contrasena, CONFIG.SECRET_CRYPTO),
          creado_por: null,
          fecha_creacion: Date.now(),
        });
        await nuevo.save();
        creados++;
      } else {
        await DispositivosBiostar.updateOne(
          { _id: existente._id },
          {
            $set: {
              nombre: device.nombre || existente.nombre,
              puerto: device.puerto || existente.puerto || CONFIG.BIOSTAR_PORT,
              usuario: existente.usuario || conexion.usuario,
              fecha_modificacion: Date.now(),
            },
          }
        );
        actualizados++;
      }
    }

    res.status(200).json({
      estado: true,
      mensaje: `Sincronizacion completada. Creados: ${creados}, actualizados: ${actualizados}.`,
      datos: { creados, actualizados, total: devices.length },
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function probarConexion(req: Request, res: Response): Promise<void> {
  try {
    const fromId = !!req.params.id;

    let dispositivo: any = null;
    if (fromId) {
      const registro = await DispositivosBiostar.findById(req.params.id);
      if (!registro) {
        res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
        return;
      }

      const body = req.body || {};
      const contrasenaLimpia = typeof body.contrasena === "string" ? body.contrasena.trim() : "";
      const encryptedPassword = contrasenaLimpia
        ? encryptPassword(contrasenaLimpia, CONFIG.SECRET_CRYPTO)
        : registro.contrasena;

      // Para editar, la prueba de conexión debe usar los datos capturados en pantalla, no solo los actuales en BD.
      dispositivo = {
        ...registro.toObject(),
        nombre: body.nombre || registro.nombre,
        direccion_ip: body.direccion_ip || registro.direccion_ip,
        puerto: Number(body.puerto) || registro.puerto || CONFIG.BIOSTAR_PORT,
        usuario: body.usuario || registro.usuario,
        contrasena: encryptedPassword,
      };
    } else {
      const { nombre, direccion_ip, puerto, usuario, contrasena } = req.body;
      dispositivo = {
        _id: new Types.ObjectId(),
        nombre: nombre || "temp",
        direccion_ip,
        puerto: Number(puerto) || CONFIG.BIOSTAR_PORT,
        usuario,
        contrasena: encryptPassword(String(contrasena || ""), CONFIG.SECRET_CRYPTO),
      };
    }

    const result = await probarConexionBiostar(dispositivo);
    if (!result.ok) {
      res.status(200).json({ estado: false, mensaje: result.message });
      return;
    }

    // ping simple para validar ciclo de sesion
    const ping = await biostarRequest(dispositivo, { method: "GET", url: "/api/user_groups" });
    if (!ping.ok) {
      res.status(200).json({ estado: false, mensaje: ping.message || "Conectado, pero fallo consulta de prueba." });
      return;
    }

    res.status(200).json({ estado: true, mensaje: "Conexion establecida correctamente." });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function listarDispositivosRemotos(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const tipo = String(req.query.tipo || "all").trim() || "all";
    const responses = await Promise.all([
      biostarRequest(conexion as any, { method: "GET", url: `/api/devices?limit=1000&device_type=${encodeURIComponent(tipo)}` }),
      biostarRequest(conexion as any, { method: "GET", url: `/api/devices?limit=1000` }),
      biostarRequest(conexion as any, { method: "POST", url: "/api/devices/search", data: { device_type: tipo } }),
    ]);

    const success = responses.find((item) => item.ok);
    if (!success) {
      const message = responses.find((item) => !item.ok)?.message || "No se pudo consultar dispositivos en BioStar.";
      res.status(200).json({ estado: false, mensaje: message });
      return;
    }

    const rows = parseRemoteDeviceRows(success.data);
    const mapped = rows.map((item: any) => ({
      id_externo: String(item?.id || item?.device_id || item?.deviceID || ""),
      nombre: String(item?.name || item?.device_name || "").trim(),
      direccion_ip: String(item?.ip_address || item?.ip || "").trim(),
      puerto: Number(item?.port || item?.server_port || CONFIG.BIOSTAR_PORT) || CONFIG.BIOSTAR_PORT,
      tipo: String(item?.device_type || item?.type || tipo || "all"),
      modelo: String(item?.model_name || item?.model || "").trim(),
      raw: item,
    }));

    res.status(200).json({ estado: true, datos: mapped });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function buscarDispositivoRemoto(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const direccion_ip = String(req.body?.direccion_ip || "").trim();
    const puerto = Number(req.body?.puerto || CONFIG.BIOSTAR_PORT);
    if (!direccion_ip) {
      res.status(200).json({ estado: false, mensaje: "Ingresa una direccion IP para buscar." });
      return;
    }

    const responses = await Promise.all([
      biostarRequest(conexion as any, { method: "POST", url: "/api/devices/search", data: { ip_address: direccion_ip, port: puerto } }),
      biostarRequest(conexion as any, { method: "POST", url: "/api/devices/search", data: { device: { ip_address: direccion_ip, port: puerto } } }),
      biostarRequest(conexion as any, { method: "GET", url: `/api/devices?limit=1000&device_type=all` }),
    ]);

    const success = responses.find((item) => item.ok);
    if (!success) {
      const message = responses.find((item) => !item.ok)?.message || "No se pudo buscar el dispositivo en BioStar.";
      res.status(200).json({ estado: false, mensaje: message });
      return;
    }

    let rows = parseRemoteDeviceRows(success.data);
    if (rows.length === 0 && responses[2]?.ok) {
      const allRows = parseRemoteDeviceRows(responses[2].data);
      rows = allRows.filter((item: any) => String(item?.ip_address || item?.ip || "").trim() === direccion_ip);
    }

    const mapped = rows.map((item: any) => ({
      id_externo: String(item?.id || item?.device_id || item?.deviceID || ""),
      nombre: String(item?.name || item?.device_name || "").trim(),
      direccion_ip: String(item?.ip_address || item?.ip || "").trim(),
      puerto: Number(item?.port || item?.server_port || CONFIG.BIOSTAR_PORT) || CONFIG.BIOSTAR_PORT,
      tipo: String(item?.device_type || item?.type || "all"),
      modelo: String(item?.model_name || item?.model || "").trim(),
      raw: item,
    }));

    res.status(200).json({ estado: true, datos: mapped });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function crearDispositivoRemoto(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const nombre = String(req.body?.nombre || "").trim();
    const direccion_ip = String(req.body?.direccion_ip || "").trim();
    const puerto = Number(req.body?.puerto || CONFIG.BIOSTAR_PORT) || CONFIG.BIOSTAR_PORT;

    if (!direccion_ip) {
      res.status(200).json({ estado: false, mensaje: "La direccion IP es obligatoria." });
      return;
    }

    const payloads = [
      { device: { name: nombre || direccion_ip, ip_address: direccion_ip, port: puerto } },
      { Device: { name: nombre || direccion_ip, ip_address: direccion_ip, port: puerto } },
      { name: nombre || direccion_ip, ip_address: direccion_ip, port: puerto },
    ];

    let lastMessage = "No se pudo agregar el dispositivo en BioStar.";
    for (const data of payloads) {
      const response = await biostarRequest(conexion as any, { method: "POST", url: "/api/devices", data });
      if (response.ok) {
        res.status(200).json({ estado: true, mensaje: "Dispositivo agregado correctamente." });
        return;
      }
      lastMessage = response.message || lastMessage;
    }

    res.status(200).json({ estado: false, mensaje: lastMessage });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function editarDispositivoRemoto(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const id = String(req.params.id || "").trim();
    const nombre = String(req.body?.nombre || "").trim();
    const direccion_ip = String(req.body?.direccion_ip || "").trim();
    const puerto = Number(req.body?.puerto || CONFIG.BIOSTAR_PORT) || CONFIG.BIOSTAR_PORT;
    if (!id) {
      res.status(200).json({ estado: false, mensaje: "ID de dispositivo invalido." });
      return;
    }

    const payloads = [
      { device: { name: nombre, ip_address: direccion_ip, port: puerto } },
      { Device: { name: nombre, ip_address: direccion_ip, port: puerto } },
      { name: nombre, ip_address: direccion_ip, port: puerto },
    ];

    let lastMessage = "No se pudo editar el dispositivo en BioStar.";
    for (const data of payloads) {
      const response = await biostarRequest(conexion as any, { method: "PUT", url: `/api/devices/${id}`, data });
      if (response.ok) {
        res.status(200).json({ estado: true, mensaje: "Dispositivo editado correctamente." });
        return;
      }
      lastMessage = response.message || lastMessage;
    }

    res.status(200).json({ estado: false, mensaje: lastMessage });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function eliminarDispositivoRemoto(req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(200).json({ estado: false, mensaje: "ID de dispositivo invalido." });
      return;
    }

    const response = await biostarRequest(conexion as any, { method: "DELETE", url: `/api/devices/${id}` });
    if (!response.ok) {
      res.status(200).json({ estado: false, mensaje: response.message || "No se pudo eliminar el dispositivo." });
      return;
    }

    res.status(200).json({ estado: true, mensaje: "Dispositivo eliminado correctamente." });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}
