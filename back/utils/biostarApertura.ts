import { Types } from "mongoose";
import DispositivosBiostar from "../models/DispositivosBiostar";
import BiostarConexion from "../models/BiostarConexion";
import { biostarRequest } from "../classes/Biostar";

const lastOpenByKey = new Map<string, number>();
const OPEN_DEDUP_WINDOW_MS = 7000;

function buildKey(params: { idAcceso: string; idPersona: string; tipo: string }) {
  return `${params.idAcceso}:${params.idPersona}:${params.tipo}`;
}

async function getBiostarConnectionCandidates() {
  const [main, local, globalConn] = await Promise.all([
    DispositivosBiostar.findOne({ activo: true, es_main: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 }),
    DispositivosBiostar.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 }),
    BiostarConexion.findOne({ activo: true }).sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 }),
  ]);
  return [main, local, globalConn].filter(Boolean) as any[];
}

async function findConexionActiva(): Promise<any | null> {
  const candidates = await getBiostarConnectionCandidates();
  for (const c of candidates) {
    const ping = await biostarRequest(c as any, { method: "GET", url: "/api/user_groups" });
    if (ping.ok) return c;
  }
  return candidates[0] || null;
}

async function unlockDoor(conexion: any, doorId: string): Promise<{ ok: boolean; message?: string }> {
  const idNum = Number(doorId);
  const ids = Number.isFinite(idNum) ? [idNum] : [doorId];
  const payloads = [
    { DoorCollection: { rows: ids.map((id) => ({ id })) } },
    { doors: ids.map((id) => ({ id })) },
    { ids },
    { Door: { id: ids[0] } },
  ];

  const endpoints = ["/api/doors/unlock", "/api/doors/open"];
  let lastMsg = "No se pudo abrir la puerta en BioStar.";
  for (const ep of endpoints) {
    for (const data of payloads) {
      const r = await biostarRequest(conexion as any, { method: "POST", url: ep, data, timeout: 12000 });
      if (r.ok) return { ok: true };
      lastMsg = r.message || lastMsg;
    }
  }
  return { ok: false, message: lastMsg };
}

export async function abrirPuertaPorAccesoBiostar(params: {
  idAcceso?: Types.ObjectId | string | null;
  idPersona?: Types.ObjectId | string | null;
  tipoPersona?: "empleado" | "visitante" | "usuario";
  origen: "hiki_evento" | "biostar_evento";
}): Promise<{ ok: boolean; skipped?: boolean; message?: string }> {
  const idAcceso = params.idAcceso ? String(params.idAcceso) : "";
  if (!idAcceso) return { ok: false, skipped: true, message: "Evento sin acceso." };
  const idPersona = params.idPersona ? String(params.idPersona) : "anon";
  const key = buildKey({ idAcceso, idPersona, tipo: params.tipoPersona || "na" });
  const now = Date.now();
  const last = lastOpenByKey.get(key) || 0;
  if (now - last < OPEN_DEDUP_WINDOW_MS) return { ok: true, skipped: true, message: "Apertura duplicada omitida." };

  const destino = await DispositivosBiostar.findOne({
    activo: true,
    id_acceso: new Types.ObjectId(idAcceso),
    apertura_destino_habilitada: true,
    apertura_puerta_id: { $nin: ["", null] },
  })
    .sort({ es_main: -1, fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
    .lean<{
      _id: Types.ObjectId;
      apertura_puerta_id?: string;
    }>();

  if (!destino?.apertura_puerta_id) {
    return { ok: false, skipped: true, message: "Sin puerta destino configurada para este acceso." };
  }

  const conexion = await findConexionActiva();
  if (!conexion) return { ok: false, message: "Sin conexion activa a BioStar." };

  const openRes = await unlockDoor(conexion, String(destino.apertura_puerta_id).trim());
  if (!openRes.ok) return { ok: false, message: openRes.message };

  lastOpenByKey.set(key, now);
  return { ok: true };
}
