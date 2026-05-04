import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { DecodedTokenUser } from "../types/jsonwebtoken";
import DispositivosBiostar from "../models/DispositivosBiostar";
import { fecha, log } from "../middlewares/log";
import { customAggregationForDataGrids, decryptPassword, encryptPassword, isEmptyObject } from "../utils/utils";
import { QueryParams } from "../types/queryparams";
import { CONFIG } from "../config";
import { validarModelo } from "../validators/validadores";
import { probarConexionBiostar, biostarRequest } from "../classes/Biostar";

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

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, direccion_ip, puerto, usuario, contrasena } = req.body;
    const creado_porID = jwt.verify(req.headers["x-access-token"] as string, CONFIG.SECRET) as DecodedTokenUser;

    const nuevoRegistro = new DispositivosBiostar({
      nombre,
      direccion_ip,
      puerto: Number(puerto) || 443,
      usuario,
      contrasena,
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
      puerto: Number(puerto) || 443,
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

    res.status(200).json({ estado: true });
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
      dispositivo = await DispositivosBiostar.findById(req.params.id);
      if (!dispositivo) {
        res.status(200).json({ estado: false, mensaje: "Dispositivo BioStar no encontrado." });
        return;
      }
    } else {
      const { nombre, direccion_ip, puerto, usuario, contrasena } = req.body;
      dispositivo = {
        _id: new Types.ObjectId(),
        nombre: nombre || "temp",
        direccion_ip,
        puerto: Number(puerto) || 443,
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
