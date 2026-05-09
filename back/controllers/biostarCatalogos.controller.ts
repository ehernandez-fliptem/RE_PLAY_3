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

async function obtenerDispositivosRemotos(conexion: any): Promise<any[]> {
  const attempts = [
    biostarRequest(conexion as any, { method: "GET", url: "/api/devices?limit=1000" }),
    biostarRequest(conexion as any, { method: "POST", url: "/api/devices/search", data: { limit: 1000, offset: 0 } }),
    biostarRequest(conexion as any, { method: "POST", url: "/api/devices", data: {} }),
  ];

  for (const p of attempts) {
    const r = await p;
    if (!r.ok) continue;
    const rows = parseRows(r.data, [
      "DeviceCollection.rows",
      "device_collection.rows",
      "rows",
      "devices",
    ]);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

function resolveGroupId(item: any): string {
  const raw =
    item?.device_group_id?.id ??
    item?.device_group_id ??
    item?.device_group?.id ??
    item?.device_group ??
    "";
  return String(raw).trim();
}

function resolveDoorGroupId(item: any): string {
  const raw =
    item?.door_group_id?.id ??
    item?.door_group_id ??
    item?.door_group?.id ??
    item?.door_group ??
    "";
  return String(raw).trim();
}

async function obtenerGruposPuertas(conexion: any): Promise<any[]> {
  const attempts = [
    biostarRequest(conexion as any, { method: "POST", url: "/api/v2/door_groups/search", data: { limit: 1000, offset: 0 } }),
    biostarRequest(conexion as any, { method: "GET", url: "/api/door_groups?limit=1000" }),
  ];
  for (const p of attempts) {
    const r = await p;
    if (!r.ok) continue;
    const rows = parseRows(r.data, ["DoorGroupCollection.rows", "rows", "door_groups"]);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

async function obtenerPuertas(conexion: any): Promise<any[]> {
  const attempts = [
    biostarRequest(conexion as any, { method: "POST", url: "/api/v2/doors/search", data: { limit: 1000, offset: 0 } }),
    biostarRequest(conexion as any, { method: "GET", url: "/api/doors?limit=1000" }),
  ];
  for (const p of attempts) {
    const r = await p;
    if (!r.ok) continue;
    const rows = parseRows(r.data, ["DoorCollection.rows", "rows", "doors"]);
    if (Array.isArray(rows)) return rows;
  }
  return [];
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

    const existentesAttempts = [
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/device_groups/only_permission_item/search", data: { order_by: "depth:false" } }),
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/device_groups/search", data: { order_by: "depth:false", limit: 1000, offset: 0 } }),
      biostarRequest(conexion as any, { method: "GET", url: "/api/device_groups?limit=1000" }),
    ];
    for (const p of existentesAttempts) {
      const r = await p;
      if (!r.ok) continue;
      const rows = parseRows(r.data, ["DeviceGroupCollection.rows", "rows", "device_groups"]);
      const existe = (rows || []).some((item: any) => String(item?.name || item?.group_name || "").trim().toLowerCase() === nombre.toLowerCase());
      if (existe) {
        res.status(200).json({ estado: false, mensaje: "No se creo el grupo porque ya existe uno con ese nombre." });
        return;
      }
      break;
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

    if (id === "1") {
      res.status(200).json({ estado: false, mensaje: "No se puede eliminar el grupo predeterminado (All Devices)." });
      return;
    }

    const migrar = String(req.query?.migrate_to_default || "").toLowerCase() === "true";
    const dispositivos = await obtenerDispositivosRemotos(conexion as any);
    const enUso = dispositivos.filter((d) => resolveGroupId(d) === id);

    if (enUso.length > 0 && !migrar) {
      res.status(200).json({
        estado: false,
        codigo: "GROUP_IN_USE",
        mensaje: `El grupo esta en uso por ${enUso.length} dispositivo(s). Si deseas eliminarlo, primero migralos a Predeterminado BioStar.`,
        datos: { total_dispositivos: enUso.length },
      });
      return;
    }

    if (enUso.length > 0 && migrar) {
      let migrados = 0;
      for (const item of enUso) {
        const deviceId = String(item?.id || item?.device_id || "").trim();
        if (!deviceId) continue;
        const payloads = [
          {
            Device: {
              id: deviceId,
              name: item?.name || item?.device_name || "",
              device_group: 1,
              device_group_id: { id: 1 },
            },
          },
          { Device: { id: deviceId, device_group: 1, device_group_id: { id: 1 } } },
          { id: deviceId, device_group: 1, device_group_id: { id: 1 } },
        ];
        for (const body of payloads) {
          const r = await requestWithEndpointFallback(conexion as any, "PUT", `/devices/${deviceId}`, body);
          if (r.ok) {
            migrados++;
            break;
          }
        }
      }
      if (migrados < enUso.length) {
        res.status(200).json({
          estado: false,
          mensaje: "No se pudieron migrar todos los dispositivos al grupo Predeterminado BioStar.",
          datos: { migrados, total: enUso.length },
        });
        return;
      }
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
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/door_groups/search", data: { limit: 1000, offset: 0 } }),
      biostarRequest(conexion as any, { method: "GET", url: "/api/door_groups?limit=1000" }),
    ];

    let rows: any[] = [];
    let message = "No se pudieron consultar grupos de puertas.";
    for (const p of attempts) {
      const r = await p;
      if (r.ok) {
        rows = parseRows(r.data, ["DoorGroupCollection.rows", "rows", "door_groups"]);
        break;
      }
      message = r.message || message;
    }

    if (!rows.length) {
      res.status(200).json({ estado: true, datos: [], mensaje: message });
      return;
    }

    const datos = rows.map((item: any) => ({
      id_externo: String(item?.id || item?.door_group_id || ""),
      nombre: String(item?.name || item?.door_group_name || "").trim(),
      depth: Number(item?.depth || 0),
      parent_id: String(item?.parent_id?.id || item?.parent_id || ""),
      es_all_door_groups:
        String(item?.name || item?.door_group_name || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim() === "all door groups",
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
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre de la puerta es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const existentesAttempts = [
      biostarRequest(conexion as any, { method: "POST", url: "/api/v2/door_groups/search", data: { limit: 1000, offset: 0 } }),
      biostarRequest(conexion as any, { method: "GET", url: "/api/door_groups?limit=1000" }),
    ];
    for (const p of existentesAttempts) {
      const r = await p;
      if (!r.ok) continue;
      const rows = parseRows(r.data, ["DoorGroupCollection.rows", "rows", "door_groups"]);
      const existe = (rows || []).some((item: any) => String(item?.name || item?.door_group_name || "").trim().toLowerCase() === nombre.toLowerCase());
      if (existe) {
        res.status(200).json({ estado: false, mensaje: "No se creo el grupo porque ya existe uno con ese nombre." });
        return;
      }
      break;
    }

    const payloads = [
      {
        DoorGroup: {
          parent_id: { id: 1 },
          isDoorGroups: true,
          depth: 1,
          sync_device_groups: [],
          sync_devices: [],
          iconCls: "doorGroupIcon",
          inherited: true,
          text: nombre,
          name: nombre,
        },
      },
      { DoorGroup: { parent_id: { id: 1 }, isDoorGroups: true, depth: 1, name: nombre, text: nombre } },
      { door_group: { parent_id: { id: 1 }, depth: 1, name: nombre } },
      { name: nombre, parent_id: { id: 1 }, depth: 1 },
    ];

    let lastError = "No se pudo crear el grupo de puertas en BioStar.";
    for (const body of payloads) {
      const createRes = await requestWithEndpointFallback(conexion as any, "POST", "/door_groups", body);
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

export async function editarPuerta(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    const nombre = String(req.body?.nombre || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id de la puerta es obligatorio." });
      return;
    }
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre de la puerta es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      { DoorGroup: { name: nombre, id: String(id) } },
      { door_group: { name: nombre, id: String(id) } },
      { id: String(id), name: nombre },
    ];

    let lastError = "No se pudo editar el grupo de puertas en BioStar.";
    for (const body of payloads) {
      const editRes = await requestWithEndpointFallback(conexion as any, "PUT", `/door_groups/${id}`, body);
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

    const delRes = await requestWithEndpointFallback(conexion as any, "DELETE", `/door_groups/${id}`);
    if (delRes.ok) {
      res.status(200).json({ estado: true, mensaje: "Grupo eliminado correctamente." });
      return;
    }

    res.status(200).json({
      estado: false,
      mensaje: toFriendlyMessage(delRes.message || extractBiostarMessage(delRes.data)) || "No se pudo eliminar el grupo de puertas.",
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function listarPuertasAcceso(_req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const [doorsRows, groupsRows, deviceRows] = await Promise.all([
      obtenerPuertas(conexion),
      obtenerGruposPuertas(conexion),
      obtenerDispositivosRemotos(conexion),
    ]);

    const gruposMap = new Map<string, string>();
    for (const g of groupsRows) {
      const gid = String(g?.id || g?.door_group_id || "").trim();
      if (!gid) continue;
      gruposMap.set(gid, String(g?.name || g?.door_group_name || "").trim());
    }

    const dispositivosMap = new Map<string, string>();
    for (const d of deviceRows) {
      const did = String(d?.id || d?.device_id || "").trim();
      if (!did) continue;
      dispositivosMap.set(did, String(d?.name || d?.device_name || d?.lan?.ip || "").trim());
    }

    const datos = doorsRows.map((item: any) => {
      const doorGroupId = resolveDoorGroupId(item);
      const deviceId = String(
        item?.entry_device_id?.id ??
        item?.device_id?.id ??
        item?.device_id ??
        item?.device?.id ??
        item?.device ??
        ""
      ).trim();
      return {
        id_externo: String(item?.id || item?.door_id || "").trim(),
        nombre: String(item?.name || item?.door_name || "").trim(),
        grupo_puerta_id: doorGroupId || "1",
        grupo_puerta_nombre: gruposMap.get(doorGroupId) || "All Door Groups",
        dispositivo_id: deviceId,
        dispositivo_nombre: dispositivosMap.get(deviceId) || "",
        rele_puerta: String(
          item?.relay?.port ??
          item?.door_relay?.port ??
          item?.relay_port ??
          item?.door_relay ??
          ""
        ).trim(),
        boton_salida: String(
          item?.exit_button?.port ??
          item?.exit_button_input?.port ??
          item?.exit_button_port ??
          item?.exit_button ??
          ""
        ).trim(),
        sensor_puerta: String(
          item?.door_sensor?.port ??
          item?.sensor?.port ??
          item?.sensor_port ??
          item?.door_sensor ??
          ""
        ).trim(),
      };
    });

    res.status(200).json({ estado: true, datos });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function listarCatalogosPuertasAcceso(_req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const [groupsRows, deviceRows] = await Promise.all([
      obtenerGruposPuertas(conexion),
      obtenerDispositivosRemotos(conexion),
    ]);

    const grupos = groupsRows.map((item: any) => ({
      id_externo: String(item?.id || item?.door_group_id || "").trim(),
      nombre: String(item?.name || item?.door_group_name || "").trim(),
    }));
    const dispositivos = deviceRows.map((item: any) => ({
      id_externo: String(item?.id || item?.device_id || "").trim(),
      nombre: String(item?.name || item?.device_name || item?.lan?.ip || "").trim(),
    }));

    res.status(200).json({ estado: true, datos: { grupos, dispositivos } });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function listarOpcionesAltaPuertaAcceso(_req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const [doorGroupsRes, deviceGroupsRes, devicesRes] = await Promise.all([
      biostarRequest(conexion as any, {
        method: "POST",
        url: "/api/v2/door_groups/only_permission_item/search",
        data: { order_by: "depth:false" },
      }),
      biostarRequest(conexion as any, {
        method: "POST",
        url: "/api/v2/device_groups/search",
        data: { order_by: "depth:false" },
      }),
      biostarRequest(conexion as any, {
        method: "POST",
        url: "/api/v2/devices/search",
        data: { exclude_device_type_id: "254" },
      }),
    ]);

    const doorGroups = doorGroupsRes.ok
      ? parseRows(doorGroupsRes.data, ["DoorGroupCollection.rows", "rows", "door_groups"])
      : [];
    const deviceGroups = deviceGroupsRes.ok
      ? parseRows(deviceGroupsRes.data, ["DeviceGroupCollection.rows", "rows", "device_groups"])
      : [];
    const devices = devicesRes.ok
      ? parseRows(devicesRes.data, ["DeviceCollection.rows", "rows", "devices"])
      : [];

    const gruposPuerta = doorGroups.map((item: any) => ({
      id_externo: String(item?.id || item?.door_group_id || "").trim(),
      nombre: String(item?.name || item?.door_group_name || "").trim(),
      depth: Number(item?.depth || 0),
      parent_id: String(item?.parent_id?.id || item?.parent_id || "").trim(),
    }));

    const gruposDispositivo = deviceGroups.map((item: any) => ({
      id_externo: String(item?.id || item?.device_group_id || "").trim(),
      nombre: String(item?.name || item?.group_name || "").trim(),
      depth: Number(item?.depth || 0),
      parent_id: String(item?.parent_id?.id || item?.parent_id || "").trim(),
    }));

    const entryDevices = devices.map((item: any) => ({
      id_externo: String(item?.id || item?.device_id || "").trim(),
      nombre: String(item?.name || item?.device_name || "").trim(),
      grupo_id: String(item?.device_group_id?.id || item?.device_group_id || "").trim(),
    }));

    res.status(200).json({
      estado: true,
      datos: { grupos_puerta: gruposPuerta, grupos_dispositivo: gruposDispositivo, entry_devices: entryDevices },
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function crearPuertaAcceso(req: Request, res: Response): Promise<void> {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const grupo_puerta_id = String(req.body?.grupo_puerta_id || "").trim();
    const dispositivo_id = String(req.body?.dispositivo_id || "").trim();
    const rele_puerta = String(req.body?.rele_puerta || "").trim();
    const boton_salida = String(req.body?.boton_salida || "").trim();
    const sensor_puerta = String(req.body?.sensor_puerta || "").trim();

    if (!nombre || !grupo_puerta_id || !dispositivo_id) {
      res.status(400).json({ estado: false, mensaje: "Nombre, grupo y dispositivo son obligatorios." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      {
        Door: {
          name: nombre,
          door_group_id: { id: Number(grupo_puerta_id) || grupo_puerta_id },
          device_id: { id: Number(dispositivo_id) || dispositivo_id },
          relay: { port: rele_puerta || "0" },
          exit_button: { port: boton_salida || "0" },
          door_sensor: { port: sensor_puerta || "0" },
        },
      },
      {
        Door: {
          name: nombre,
          door_group_id: { id: Number(grupo_puerta_id) || grupo_puerta_id },
          entry_device_id: { id: Number(dispositivo_id) || dispositivo_id },
          door_relay: { port: rele_puerta || "0" },
          exit_button_input: { port: boton_salida || "0" },
          sensor: { port: sensor_puerta || "0" },
        },
      },
      {
        door: {
          name: nombre,
          door_group_id: Number(grupo_puerta_id) || grupo_puerta_id,
          device_id: Number(dispositivo_id) || dispositivo_id,
          door_relay: rele_puerta || "0",
          exit_button: boton_salida || "0",
          door_sensor: sensor_puerta || "0",
        },
      },
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

export async function editarPuertaAcceso(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    const nombre = String(req.body?.nombre || "").trim();
    const grupo_puerta_id = String(req.body?.grupo_puerta_id || "").trim();
    const dispositivo_id = String(req.body?.dispositivo_id || "").trim();
    const rele_puerta = String(req.body?.rele_puerta || "").trim();
    const boton_salida = String(req.body?.boton_salida || "").trim();
    const sensor_puerta = String(req.body?.sensor_puerta || "").trim();

    if (!id || !nombre || !grupo_puerta_id || !dispositivo_id) {
      res.status(400).json({ estado: false, mensaje: "Id, nombre, grupo y dispositivo son obligatorios." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      {
        Door: {
          id,
          name: nombre,
          door_group_id: { id: Number(grupo_puerta_id) || grupo_puerta_id },
          device_id: { id: Number(dispositivo_id) || dispositivo_id },
          relay: { port: rele_puerta || "0" },
          exit_button: { port: boton_salida || "0" },
          door_sensor: { port: sensor_puerta || "0" },
        },
      },
      {
        Door: {
          id,
          name: nombre,
          door_group_id: { id: Number(grupo_puerta_id) || grupo_puerta_id },
          entry_device_id: { id: Number(dispositivo_id) || dispositivo_id },
          door_relay: { port: rele_puerta || "0" },
          exit_button_input: { port: boton_salida || "0" },
          sensor: { port: sensor_puerta || "0" },
        },
      },
      {
        door: {
          id,
          name: nombre,
          door_group_id: Number(grupo_puerta_id) || grupo_puerta_id,
          device_id: Number(dispositivo_id) || dispositivo_id,
          door_relay: rele_puerta || "0",
          exit_button: boton_salida || "0",
          door_sensor: sensor_puerta || "0",
        },
      },
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

export async function eliminarPuertaAcceso(req: Request, res: Response): Promise<void> {
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

export async function listarOpcionesDispositivoPuertaAcceso(req: Request, res: Response): Promise<void> {
  try {
    const deviceId = String(req.query?.device_id || "").trim();
    if (!deviceId) {
      res.status(400).json({ estado: false, mensaje: "El device_id es obligatorio." });
      return;
    }

    const conexion = await getBiostarConexionActiva();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const candidatesRes = await biostarRequest(conexion as any, { method: "GET", url: "/api/devices/candidates" });
    if (!candidatesRes.ok) {
      res.status(200).json({
        estado: false,
        mensaje: toFriendlyMessage(candidatesRes.message || extractBiostarMessage(candidatesRes.data)) || "No se pudieron consultar candidatos del dispositivo.",
      });
      return;
    }

    const rows = parseRows(candidatesRes.data, ["DeviceRelayCollection.rows", "rows"]);
    const puertosSet = new Set<string>();

    for (const item of rows) {
      const did = String(item?.device_id?.id || item?.device_id || "").trim();
      if (did !== deviceId) continue;
      const relayIndex = String(item?.relay_index ?? "").trim();
      if (relayIndex !== "") puertosSet.add(relayIndex);
    }

    const puertosRelay = Array.from(puertosSet)
      .sort((a, b) => Number(a) - Number(b))
      .map((valor) => ({ valor, etiqueta: `Puerto ${valor}` }));

    let puertosEntrada: Array<{ valor: string; etiqueta: string }> = [];
    const deviceSearchRes = await biostarRequest(conexion as any, {
      method: "POST",
      url: "/api/v2/devices/search",
      data: { id: Number(deviceId) || deviceId },
    });
    if (deviceSearchRes.ok) {
      const deviceRows = parseRows(deviceSearchRes.data, ["DeviceCollection.rows", "rows", "devices"]);
      const device = (deviceRows || []).find((d: any) => String(d?.id || d?.device_id || "").trim() === deviceId);
      const input = device?.input || {};
      const possibleCounts = [
        input?.num_inputs,
        input?.number_of_inputs,
        input?.normal_inputs,
        input?.supervised_inputs_count,
      ];
      const count = possibleCounts
        .map((v: any) => Number(v))
        .find((v: number) => Number.isFinite(v) && v > 0);
      if (count) {
        puertosEntrada = Array.from({ length: count }, (_, i) => ({
          valor: String(i),
          etiqueta: `Input Port ${i}`,
        }));
      }
    }
    if (!puertosEntrada.length) {
      puertosEntrada = puertosRelay.map((p) => ({ valor: p.valor, etiqueta: `Input Port ${p.valor}` }));
    }

    res.status(200).json({
      estado: true,
      datos: {
        rele_puerta: puertosRelay,
        boton_salida: puertosEntrada,
        sensor_puerta: puertosEntrada,
      },
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}
