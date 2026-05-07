import { Request, Response } from "express";
import BiostarConexion from "../models/BiostarConexion";
import DispositivosBiostar from "../models/DispositivosBiostar";
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
  const main = await DispositivosBiostar.findOne({ activo: true, es_main: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });
  const conexionGlobal = await BiostarConexion.findOne({ activo: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });
  const activa = await DispositivosBiostar.findOne({ activo: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });

  const candidates = [main, conexionGlobal, activa].filter(Boolean) as any[];
  const tried = new Set<string>();

  for (const candidate of candidates) {
    const key = `${candidate?.constructor?.modelName || "unknown"}:${String(candidate?._id || "")}`;
    if (tried.has(key)) continue;
    tried.add(key);

    const ping = await biostarRequest(candidate as any, { method: "GET", url: "/api/user_groups" });
    if (ping.ok) return candidate;
  }

  return candidates[0] || null;
}

function extractBiostarMessage(payload: any): string {
  return (
    payload?.Response?.message ||
    payload?.response?.message ||
    payload?.message ||
    payload?.error ||
    ""
  );
}

function toFriendlyMessage(raw?: string): string {
  const msg = String(raw || "").trim();
  if (!msg) return "No se pudo completar la operacion en BioStar.";
  const lower = msg.toLowerCase();
  if (lower.includes("failed to parse json")) return "No se pudo procesar la solicitud en BioStar.";
  if (lower.includes("request is not supported")) return "La version de BioStar no soporta esta operacion con el formato enviado.";
  if (lower.includes("already") || lower.includes("exists") || lower.includes("duplicat")) return "El grupo ya esta registrado.";
  return msg;
}

async function requestWithEndpointFallback(
  conexion: any,
  method: "POST" | "PUT" | "DELETE",
  path: string,
  data?: any
) {
  const endpoints = [`/api${path}`, `/api/v2${path}`];
  let result: { ok: boolean; data?: any; status?: number; message?: string } = { ok: false };
  for (const url of endpoints) {
    result = await biostarRequest(conexion, { method, url, data });
    if (result.ok) break;
  }
  return result;
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

    const datos = rows.map((item: any) => {
      const nombre = String(item?.name || item?.group_name || "").trim();
      const normalized = nombre.toLowerCase().replace(/\s+/g, " ").trim();
      const es_all_devices = normalized === "all devices" || normalized === "all device";
      return {
        id_externo: String(item?.id || item?.device_group_id || ""),
        nombre,
        depth: Number(item?.depth || 0),
        parent_id: String(item?.parent_id?.id || item?.parent_id || ""),
        es_all_devices,
      };
    });

    res.status(200).json({ estado: true, datos });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function crearGrupoDispositivo(_req: Request, res: Response): Promise<void> {
  try {
    const nombre = String(_req.body?.nombre || "").trim();
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre del grupo es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      { DeviceGroup: { name: nombre, parent_id: { id: 1 }, depth: 1 } },
      { DeviceGroupCollection: { rows: [{ name: nombre, parent_id: { id: 1 }, depth: 1 }] } },
      { device_group: { name: nombre, parent_id: { id: 1 }, depth: 1 } },
      { name: nombre, parent_id: { id: 1 }, depth: 1 },
    ];

    let lastError = "No se pudo crear el grupo de dispositivos en BioStar.";
    for (const body of payloads) {
      const createRes = await requestWithEndpointFallback(conexion as any, "POST", "/device_groups", body);
      if (createRes.ok) {
        res.status(200).json({ estado: true, mensaje: "Grupo creado correctamente." });
        return;
      }
      lastError = toFriendlyMessage(createRes.message || extractBiostarMessage(createRes.data));
    }

    res.status(200).json({ estado: false, mensaje: lastError });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function editarGrupoDispositivo(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    const nombre = String(req.body?.nombre || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id del grupo es obligatorio." });
      return;
    }
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre del grupo es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      { DeviceGroup: { id: Number(id), name: nombre } },
      { device_group: { id: Number(id), name: nombre } },
      { id: Number(id), name: nombre },
    ];

    let lastError = "No se pudo editar el grupo de dispositivos en BioStar.";
    for (const body of payloads) {
      const editRes = await requestWithEndpointFallback(conexion as any, "PUT", `/device_groups/${id}`, body);
      if (editRes.ok) {
        res.status(200).json({ estado: true, mensaje: "Grupo editado correctamente." });
        return;
      }
      lastError = toFriendlyMessage(editRes.message || extractBiostarMessage(editRes.data));
    }

    res.status(200).json({ estado: false, mensaje: lastError });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function eliminarGrupoDispositivo(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id del grupo es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const delRes = await requestWithEndpointFallback(conexion as any, "DELETE", `/device_groups/${id}`);
    if (delRes.ok) {
      res.status(200).json({ estado: true, mensaje: "Grupo eliminado correctamente." });
      return;
    }

    res.status(200).json({
      estado: false,
      mensaje: toFriendlyMessage(delRes.message || extractBiostarMessage(delRes.data)) || "No se pudo eliminar el grupo de dispositivos.",
    });
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
      dispositivo: String(item?.device?.name || item?.device_name || item?.device_id?.id || item?.device_id || ""),
      dispositivo_id: String(item?.device_id?.id || item?.device_id || ""),
    }));

    res.status(200).json({ estado: true, datos });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function crearPuerta(req: Request, res: Response): Promise<void> {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const dispositivo_id = String(req.body?.dispositivo_id || "").trim();
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre de la puerta es obligatorio." });
      return;
    }
    if (!dispositivo_id) {
      res.status(400).json({ estado: false, mensaje: "El dispositivo es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      { Door: { name: nombre, device_id: { id: Number(dispositivo_id) || dispositivo_id } } },
      { door: { name: nombre, device_id: { id: Number(dispositivo_id) || dispositivo_id } } },
      { name: nombre, device_id: { id: Number(dispositivo_id) || dispositivo_id } },
      { name: nombre, device_id: Number(dispositivo_id) || dispositivo_id },
    ];

    let lastError = "No se pudo crear la puerta en BioStar.";
    for (const body of payloads) {
      const createRes = await requestWithEndpointFallback(conexion as any, "POST", "/doors", body);
      if (createRes.ok) {
        res.status(200).json({ estado: true, mensaje: "Puerta creada correctamente." });
        return;
      }
      lastError = toFriendlyMessage(createRes.message || extractBiostarMessage(createRes.data));
    }

    res.status(200).json({ estado: false, mensaje: lastError });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function editarPuerta(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    const nombre = String(req.body?.nombre || "").trim();
    const dispositivo_id = String(req.body?.dispositivo_id || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id de la puerta es obligatorio." });
      return;
    }
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre de la puerta es obligatorio." });
      return;
    }
    if (!dispositivo_id) {
      res.status(400).json({ estado: false, mensaje: "El dispositivo es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      { Door: { id: Number(id) || id, name: nombre, device_id: { id: Number(dispositivo_id) || dispositivo_id } } },
      { door: { id: Number(id) || id, name: nombre, device_id: { id: Number(dispositivo_id) || dispositivo_id } } },
      { id: Number(id) || id, name: nombre, device_id: { id: Number(dispositivo_id) || dispositivo_id } },
      { name: nombre, device_id: Number(dispositivo_id) || dispositivo_id },
    ];

    let lastError = "No se pudo editar la puerta en BioStar.";
    for (const body of payloads) {
      const editRes = await requestWithEndpointFallback(conexion as any, "PUT", `/doors/${id}`, body);
      if (editRes.ok) {
        res.status(200).json({ estado: true, mensaje: "Puerta editada correctamente." });
        return;
      }
      lastError = toFriendlyMessage(editRes.message || extractBiostarMessage(editRes.data));
    }

    res.status(200).json({ estado: false, mensaje: lastError });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function eliminarPuerta(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id de la puerta es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const delRes = await requestWithEndpointFallback(conexion as any, "DELETE", `/doors/${id}`);
    if (delRes.ok) {
      res.status(200).json({ estado: true, mensaje: "Puerta eliminada correctamente." });
      return;
    }

    res.status(200).json({
      estado: false,
      mensaje: toFriendlyMessage(delRes.message || extractBiostarMessage(delRes.data)) || "No se pudo eliminar la puerta.",
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}
