import dayjs from "dayjs";
import { Types } from "mongoose";
import BiostarConexion from "../../models/BiostarConexion";
import DispositivosSuprema from "../../models/DispositivosSuprema";
import DispositivosBiostar from "../../models/DispositivosBiostar";
import Empleados from "../../models/Empleados";
import Usuarios from "../../models/Usuarios";
import Eventos from "../../models/Eventos";
import { biostarRequest } from "../../classes/Biostar";

const BIOSTAR_EVENT_INITIAL_LOOKBACK_HOURS = 24;
const BIOSTAR_EVENT_OVERLAP_SECONDS = 15;
const BIOSTAR_EVENT_LIMIT = 1000;
const BIOSTAR_TIPO_DISPOSITIVO = 3;
const EVENT_TYPES_CACHE_TTL_MS = 10 * 60 * 1000;
const DEVICE_CACHE_TTL_MS = 60 * 1000;

let jobRunning = false;
let lastSyncAt: dayjs.Dayjs | null = null;
let eventTypeCache: {
  expiresAt: number;
  grantedCodes: Set<number>;
  deniedCodes: Set<number>;
} | null = null;
let activeDeviceCache: {
  expiresAt: number;
  ids: Set<string>;
  rows: any[];
} | null = null;

function getRows(payload: any): any[] {
  const rows = payload?.EventCollection?.rows;
  return Array.isArray(rows) ? rows : [];
}

function toNumber(val: unknown): number {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBiostarEventType(
  row: any,
  grantedCodes: Set<number>,
  deniedCodes: Set<number>
): "ACCESS_GRANTED" | "ACCESS_DENIED" | "IGNORE" {
  const userCode = String(row?.user_id?.user_id || "").trim();
  if (!userCode) return "IGNORE";

  const eventCode = toNumber(row?.event_type_id?.code);
  if (grantedCodes.has(eventCode)) return "ACCESS_GRANTED";
  if (deniedCodes.has(eventCode)) return "ACCESS_DENIED";
  return "IGNORE";
}

async function resolveTipoCheck(params: {
  idEmpleado?: Types.ObjectId | null;
  idUsuario?: Types.ObjectId | null;
  idPanel: Types.ObjectId | null;
  fecha: Date;
}): Promise<5 | 6> {
  const { idEmpleado, idUsuario, idPanel, fecha } = params;
  const personaMatch: Record<string, unknown> = idEmpleado
    ? { id_empleado: idEmpleado }
    : idUsuario
      ? { id_usuario: idUsuario }
      : {};
  if (!Object.keys(personaMatch).length) return 5;

  const match: Record<string, unknown> = {
    ...personaMatch,
    tipo_check: { $in: [5, 6] },
    fecha_creacion: { $lte: fecha },
  };
  if (idPanel) match.id_panel = idPanel;

  const ultimo = await Eventos.findOne(match, "tipo_check")
    .sort({ fecha_creacion: -1 })
    .lean<{ tipo_check?: number }>();

  if (!ultimo?.tipo_check) return 5;
  return ultimo.tipo_check === 5 ? 6 : 5;
}

function parseEventDate(row: any): Date {
  const raw = String(row?.datetime || row?.server_datetime || "").trim();
  const d = dayjs(raw);
  return d.isValid() ? d.toDate() : new Date();
}

function getByPath(source: any, path: string): any {
  return path.split(".").reduce((acc: any, key) => (acc == null ? undefined : acc[key]), source);
}

function parseRows(source: any, paths: string[]): any[] {
  for (const path of paths) {
    const candidate = getByPath(source, path);
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function consultarEventosConFallback(payload: any): Promise<{
  ok: boolean;
  data?: any;
  status?: number;
  source?: string;
  message?: string;
}> {
  const candidatos: Array<{ source: string; conn: any }> = [];

  const dispositivosBiostar = await DispositivosBiostar.find({ activo: true })
    .sort({ es_main: -1, fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
    .limit(5);
  dispositivosBiostar.forEach((d) => candidatos.push({ source: "biostar_dispositivos", conn: d }));

  const dispositivosSuprema = await DispositivosSuprema.find({ activo: true })
    .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
    .limit(5);
  dispositivosSuprema.forEach((d) => candidatos.push({ source: "suprema_dispositivos", conn: d }));

  const conexionGlobal = await BiostarConexion.findOne({ activo: true })
    .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
  if (conexionGlobal) candidatos.push({ source: "biostar_conexion_global", conn: conexionGlobal });

  if (!candidatos.length) {
    return { ok: false, message: "Sin conexiones activas para BioStar." };
  }

  let ultimoError = "No se pudo consultar eventos con ninguna conexion.";
  for (const item of candidatos) {
    const response = await biostarRequest(item.conn as any, {
      method: "POST",
      url: "/api/events/search",
      data: payload,
      timeout: 12000,
    });
    if (response.ok) {
      return { ...response, source: item.source };
    }
    ultimoError = response.message || `Fallo en ${item.source}`;
    console.log("[BIOSTAR_EVENTS] Conexion fallida", {
      source: item.source,
      ip: item?.conn?.direccion_ip,
      puerto: item?.conn?.puerto,
      user: item?.conn?.usuario,
      reason: ultimoError,
    });
  }

  return { ok: false, message: ultimoError };
}

async function requestWithFallback(path: string, data?: any): Promise<{
  ok: boolean;
  data?: any;
  source?: string;
  message?: string;
}> {
  const candidatos: Array<{ source: string; conn: any }> = [];
  const dispositivosBiostar = await DispositivosBiostar.find({ activo: true })
    .sort({ es_main: -1, fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
    .limit(5);
  dispositivosBiostar.forEach((d) => candidatos.push({ source: "biostar_dispositivos", conn: d }));
  const dispositivosSuprema = await DispositivosSuprema.find({ activo: true })
    .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
    .limit(5);
  dispositivosSuprema.forEach((d) => candidatos.push({ source: "suprema_dispositivos", conn: d }));
  const conexionGlobal = await BiostarConexion.findOne({ activo: true })
    .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
  if (conexionGlobal) candidatos.push({ source: "biostar_conexion_global", conn: conexionGlobal });

  let ultimoError = `Fallo consultando ${path}`;
  for (const item of candidatos) {
    const response = await biostarRequest(item.conn as any, {
      method: data ? "POST" : "GET",
      url: path,
      data,
      timeout: 12000,
    });
    if (response.ok) return { ok: true, data: response.data, source: item.source };
    ultimoError = response.message || ultimoError;
  }
  return { ok: false, message: ultimoError };
}

async function getActiveDevices(): Promise<{ ids: Set<string>; rows: any[] }> {
  const now = Date.now();
  if (activeDeviceCache && activeDeviceCache.expiresAt > now) {
    return { ids: activeDeviceCache.ids, rows: activeDeviceCache.rows };
  }

  const result = await requestWithFallback("/api/v2/devices/only_permission_item/search", {});
  if (!result.ok) {
    console.log("[BIOSTAR_EVENTS] No se pudo consultar dispositivos activos:", result.message);
    return { ids: activeDeviceCache?.ids || new Set<string>(), rows: activeDeviceCache?.rows || [] };
  }

  const rows = parseRows(result.data, ["DeviceCollection.rows", "rows", "devices"]);
  const ids = new Set<string>();
  rows.forEach((d: any) => {
    const status = toNumber(d?.status);
    if (status === 1) ids.add(String(d?.id || "").trim());
  });
  activeDeviceCache = { expiresAt: now + DEVICE_CACHE_TTL_MS, ids, rows };
  return { ids, rows };
}

async function getEventTypeMaps(): Promise<{ grantedCodes: Set<number>; deniedCodes: Set<number> }> {
  const now = Date.now();
  if (eventTypeCache && eventTypeCache.expiresAt > now) {
    return { grantedCodes: eventTypeCache.grantedCodes, deniedCodes: eventTypeCache.deniedCodes };
  }

  const result = await requestWithFallback("/api/event_types");
  if (!result.ok) {
    console.log("[BIOSTAR_EVENTS] No se pudo consultar event_types, usando fallback por codigo.");
    return {
      grantedCodes: new Set([4864, 4865, 4866, 4867, 4868]),
      deniedCodes: new Set([5120, 5121, 5122, 5123, 5124, 5125, 5126, 5127, 6146, 6400, 6401, 6402, 6403, 6404, 6405, 6406, 6407, 6418]),
    };
  }

  const rows = parseRows(result.data, ["EventTypeCollection.rows", "rows"]);
  const grantedCodes = new Set<number>();
  const deniedCodes = new Set<number>();
  rows.forEach((et: any) => {
    const code = toNumber(et?.code);
    const name = String(et?.name || "").toUpperCase();
    if (!code || !name) return;
    if (name.includes("VERIFY_SUCCESS") || name.includes("IDENTIFY_SUCCESS")) grantedCodes.add(code);
    if (name.includes("VERIFY_FAIL") || name.includes("IDENTIFY_FAIL") || name.includes("ACCESS_DENIED") || name.includes("AUTH_FAILED")) {
      deniedCodes.add(code);
    }
  });

  eventTypeCache = {
    expiresAt: now + EVENT_TYPES_CACHE_TTL_MS,
    grantedCodes,
    deniedCodes,
  };
  return { grantedCodes, deniedCodes };
}

export async function sincronizarEventosBiostar(): Promise<void> {
  if (jobRunning) return;
  jobRunning = true;

  try {
    const cicloInicio = Date.now();
    let totalRows = 0;
    let totalCandidatos = 0;
    let totalInsertados = 0;
    let omitidosIgnorados = 0;
    let omitidosDuplicados = 0;
    let omitidosSinEmpleado = 0;
    let omitidosSinPanelMap = 0;
    let omitidosDispositivoInactivo = 0;

    const hasta = dayjs();
    const desde = lastSyncAt
      ? lastSyncAt.subtract(BIOSTAR_EVENT_OVERLAP_SECONDS, "second")
      : hasta.subtract(BIOSTAR_EVENT_INITIAL_LOOKBACK_HOURS, "hour");

    const payload = {
      Query: {
        limit: BIOSTAR_EVENT_LIMIT,
        conditions: [
          {
            column: "datetime",
            operator: 3,
            values: [desde.toISOString(), hasta.toISOString()],
          },
        ],
      },
    };

    const response = await consultarEventosConFallback(payload);

    if (!response.ok) {
      console.log("[BIOSTAR_EVENTS] No se pudo consultar eventos:", response.message || response.status);
      return;
    }
    console.log("[BIOSTAR_EVENTS] Fuente de conexion usada:", response.source);
    const { ids: activeDeviceIds, rows: activeDeviceRows } = await getActiveDevices();
    const { grantedCodes, deniedCodes } = await getEventTypeMaps();

    const rows = getRows(response.data).sort((a, b) => toNumber(a?.id) - toNumber(b?.id));
    totalRows = rows.length;

    if (!rows.length) {
      console.log("[BIOSTAR_EVENTS] Sin eventos en ventana.", {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });
      lastSyncAt = hasta;
      return;
    }

    const [suprema, biostarLocal] = await Promise.all([
      DispositivosSuprema.find({ activo: true }, "_id nombre direccion_ip").lean<{ _id: Types.ObjectId; nombre?: string; direccion_ip?: string }[]>(),
      DispositivosBiostar.find({ activo: true }, "_id nombre direccion_ip").lean<{ _id: Types.ObjectId; nombre?: string; direccion_ip?: string }[]>(),
    ]);
    const panelByName = new Map<string, Types.ObjectId>();
    const panelByIp = new Map<string, Types.ObjectId>();
    suprema.forEach((d) => {
      const key = String(d.nombre || "").trim().toLowerCase();
      if (key) panelByName.set(key, d._id);
      const ip = String(d.direccion_ip || "").trim();
      if (ip) panelByIp.set(ip, d._id);
    });
    biostarLocal.forEach((d) => {
      // Fallback: solo usa biostar_dispositivos si no existe mapeo en suprema_dispositivos
      const key = String(d.nombre || "").trim().toLowerCase();
      if (key && !panelByName.has(key)) panelByName.set(key, d._id);
      const ip = String(d.direccion_ip || "").trim();
      if (ip && !panelByIp.has(ip)) panelByIp.set(ip, d._id);
    });
    const biostarDeviceToPanel = new Map<string, Types.ObjectId>();
    activeDeviceRows.forEach((d: any) => {
      const devId = String(d?.id || "").trim();
      if (!devId) return;
      const ip = String(d?.lan?.ip || d?.ip_address || d?.ip || "").trim();
      const name = String(d?.name || "").trim().toLowerCase();
      let panelId = (ip && panelByIp.get(ip)) || null;
      if (!panelId && name) {
        panelId = panelByName.get(name) || null;
        if (!panelId) {
          const fuzzy = Array.from(panelByName.entries()).find(([key]) => key.includes(name) || name.includes(key));
          if (fuzzy) panelId = fuzzy[1];
        }
      }
      if (panelId) biostarDeviceToPanel.set(devId, panelId);
    });

    for (const row of rows) {
      const deviceId = String(row?.device_id?.id || "").trim();
      if (activeDeviceIds.size > 0 && deviceId && !activeDeviceIds.has(deviceId)) {
        omitidosDispositivoInactivo++;
        continue;
      }

      const biostarEventType = getBiostarEventType(row, grantedCodes, deniedCodes);
      if (biostarEventType === "IGNORE") {
        omitidosIgnorados++;
        continue;
      }
      totalCandidatos++;

      const eventId = String(row?.id || "").trim();
      const userCode = toNumber(row?.user_id?.user_id);
      if (!eventId || !userCode) continue;

      const deviceName = String(row?.device_id?.name || "").trim().toLowerCase();
      let idPanel = (deviceId && biostarDeviceToPanel.get(deviceId)) || null;
      if (!idPanel && deviceName) {
        idPanel = panelByName.get(deviceName) || null;
      }
      if (!idPanel) omitidosSinPanelMap++;

      const duplicado = await Eventos.exists({
        tipo_dispositivo: BIOSTAR_TIPO_DISPOSITIVO,
        fecha_panel_raw: eventId,
      });
      if (duplicado) {
        omitidosDuplicados++;
        continue;
      }

      const userCodeStr = String(row?.user_id?.user_id || "").trim();
      const [empleadoByBiostarUserId, empleadoByIdEmpleado, usuarioSistema] = await Promise.all([
        Empleados.findOne({ biostar_user_id: userCodeStr }, "_id img_usuario").lean<{ _id: Types.ObjectId; img_usuario?: string }>(),
        Empleados.findOne({ id_empleado: userCode }, "_id img_usuario").lean<{ _id: Types.ObjectId; img_usuario?: string }>(),
        Usuarios.findOne({ id_general: userCode }, "_id img_usuario").lean<{ _id: Types.ObjectId; img_usuario?: string }>(),
      ]);
      const empleadoFinal = empleadoByBiostarUserId?._id ? empleadoByBiostarUserId : empleadoByIdEmpleado;
      if (!empleadoFinal?._id && !usuarioSistema?._id) {
        omitidosSinEmpleado++;
        continue;
      }

      const fechaEvento = parseEventDate(row);
      const eventCode = toNumber(row?.event_type_id?.code);
        const tipo_check = biostarEventType === "ACCESS_DENIED"
        ? 7
        : await resolveTipoCheck({
          idEmpleado: empleadoFinal?._id || null,
          idUsuario: usuarioSistema?._id || null,
          idPanel,
          fecha: fechaEvento,
        });

      await new Eventos({
        tipo_dispositivo: BIOSTAR_TIPO_DISPOSITIVO,
        id_empleado: empleadoFinal?._id || null,
        id_usuario: usuarioSistema?._id || null,
        img_usuario: empleadoFinal?.img_usuario || usuarioSistema?.img_usuario || "",
        id_panel: idPanel,
        tipo_check,
        qr: String(userCode),
        fecha_creacion: fechaEvento,
        fecha_panel_raw: eventId,
        comentario: `BIOSTAR_EVENT:${eventId};CODE:${eventCode};DEVICE:${String(row?.device_id?.name || "").trim()}`,
      }).save();
      totalInsertados++;
    }

    console.log("[BIOSTAR_EVENTS] Resumen ciclo", {
      consultados: totalRows,
      candidatos: totalCandidatos,
      insertados: totalInsertados,
      omitidos: {
        ignorados: omitidosIgnorados,
        dispositivoInactivo: omitidosDispositivoInactivo,
        duplicados: omitidosDuplicados,
        sinEmpleado: omitidosSinEmpleado,
        sinPanelMap: omitidosSinPanelMap,
      },
      dispositivosActivos: activeDeviceIds.size,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      duracionMs: Date.now() - cicloInicio,
    });
    lastSyncAt = hasta;
  } catch (error: any) {
    console.log("[BIOSTAR_EVENTS] Error sincronizando eventos:", error?.message || error);
  } finally {
    jobRunning = false;
  }
}
