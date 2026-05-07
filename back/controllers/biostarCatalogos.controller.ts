import { Request, Response } from "express";
import BiostarConexion from "../models/BiostarConexion";
import { biostarRequest } from "../classes/Biostar";
import { fecha, log } from "../middlewares/log";

function parseRows(payload: any, keys: string[]): any[] {
  for (const key of keys) {
    const value = key.split(".").reduce((acc: any, part: string) => (acc ? acc[part] : undefined), payload);
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function getBiostarConexionActiva(): Promise<any | null> {
  const conexion = await BiostarConexion.findOne({ activo: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });
  return conexion || null;
}

export async function listarGruposDispositivos(_req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const attempts = [
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/device_groups/only_permission_item/search", data: { order_by: "depth:false" } }),
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/device_groups/search", data: { order_by: "depth:false", limit: 1000, offset: 0 } }),
      biostarRequest(conexion as any, { method: "GET", url: "/api/device_groups?limit=1000" }),
    ];

    let rows: any[] = [];
    let message = "No se pudieron consultar grupos de dispositivos.";
    for (const p of attempts) {
      const r = await p;
      if (r.ok) {
        rows = parseRows(r.data, ["DeviceGroupCollection.rows", "rows", "device_groups"]);
        break;
      }
      message = r.message || message;
    }

    if (!rows.length) {
      res.status(200).json({ estado: true, datos: [], mensaje: message });
      return;
    }

    const datos = rows.map((item: any) => ({
      id_externo: String(item?.id || item?.device_group_id || ""),
      nombre: String(item?.name || item?.group_name || "").trim(),
      depth: Number(item?.depth || 0),
      parent_id: String(item?.parent_id?.id || item?.parent_id || ""),
    }));

    res.status(200).json({ estado: true, datos });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function listarPuertas(_req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const attempts = [
      biostarRequest(conexion as any, { method: "GET", url: "/api/doors?limit=1000" }),
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/doors/search", data: { limit: 1000, offset: 0 } }),
    ];

    let rows: any[] = [];
    let message = "No se pudieron consultar puertas.";
    for (const p of attempts) {
      const r = await p;
      if (r.ok) {
        rows = parseRows(r.data, ["DoorCollection.rows", "rows", "doors"]);
        break;
      }
      message = r.message || message;
    }

    if (!rows.length) {
      res.status(200).json({ estado: true, datos: [], mensaje: message });
      return;
    }

    const datos = rows.map((item: any) => ({
      id_externo: String(item?.id || item?.door_id || ""),
      nombre: String(item?.name || item?.door_name || "").trim(),
      dispositivo: String(item?.device_id?.id || item?.device?.name || ""),
    }));

    res.status(200).json({ estado: true, datos });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}
