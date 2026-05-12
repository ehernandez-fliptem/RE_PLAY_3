import dayjs from "dayjs";
import { Types } from "mongoose";
import BiostarConexion from "../../models/BiostarConexion";
import DispositivosSuprema from "../../models/DispositivosSuprema";
import Empleados from "../../models/Empleados";
import Eventos from "../../models/Eventos";
import { biostarRequest } from "../../classes/Biostar";

const BIOSTAR_EVENT_POLL_WINDOW_SECONDS = 150;
const BIOSTAR_EVENT_LIMIT = 200;
const BIOSTAR_TIPO_DISPOSITIVO = 3;
const BIOSTAR_IN_CODE_MIN = 4096;
const BIOSTAR_IN_CODE_MAX = 4868;

let jobRunning = false;

function getRows(payload: any): any[] {
  const rows = payload?.EventCollection?.rows;
  return Array.isArray(rows) ? rows : [];
}

function toNumber(val: unknown): number {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCandidateCheckEvent(row: any): boolean {
  const userCode = String(row?.user_id?.user_id || "").trim();
  if (!userCode) return false;

  const eventCode = toNumber(row?.event_type_id?.code);
  return eventCode >= BIOSTAR_IN_CODE_MIN && eventCode <= BIOSTAR_IN_CODE_MAX;
}

async function resolveTipoCheck(params: {
  idEmpleado: Types.ObjectId;
  idPanel: Types.ObjectId | null;
  fecha: Date;
}): Promise<5 | 6> {
  const { idEmpleado, idPanel, fecha } = params;

  const match: Record<string, unknown> = {
    id_empleado: idEmpleado,
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

export async function sincronizarEventosBiostar(): Promise<void> {
  if (jobRunning) return;
  jobRunning = true;

  try {
    const conexion = await BiostarConexion.findOne({ activo: true })
      .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (!conexion) return;

    const hasta = dayjs();
    const desde = hasta.subtract(BIOSTAR_EVENT_POLL_WINDOW_SECONDS, "second");

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

    const response = await biostarRequest(conexion as any, {
      method: "POST",
      url: "/api/events/search",
      data: payload,
      timeout: 12000,
    });

    if (!response.ok) {
      console.log("[BIOSTAR_EVENTS] No se pudo consultar eventos:", response.message || response.status);
      return;
    }

    const rows = getRows(response.data)
      .filter(isCandidateCheckEvent)
      .sort((a, b) => toNumber(a?.id) - toNumber(b?.id));

    if (!rows.length) return;

    const suprema = await DispositivosSuprema.find({ activo: true }, "_id nombre").lean<{ _id: Types.ObjectId; nombre?: string }[]>();
    const panelByName = new Map<string, Types.ObjectId>();
    suprema.forEach((d) => {
      const key = String(d.nombre || "").trim().toLowerCase();
      if (key) panelByName.set(key, d._id);
    });

    for (const row of rows) {
      const eventId = String(row?.id || "").trim();
      const userCode = toNumber(row?.user_id?.user_id);
      if (!eventId || !userCode) continue;

      const deviceName = String(row?.device_id?.name || "").trim().toLowerCase();
      const idPanel = panelByName.get(deviceName) || null;

      const duplicado = await Eventos.exists({
        tipo_dispositivo: BIOSTAR_TIPO_DISPOSITIVO,
        fecha_panel_raw: eventId,
      });
      if (duplicado) continue;

      const empleado = await Empleados.findOne({ id_empleado: userCode }, "_id img_usuario").lean<{ _id: Types.ObjectId; img_usuario?: string }>();
      if (!empleado?._id) {
        continue;
      }

      const fechaEvento = parseEventDate(row);
      const tipo_check = await resolveTipoCheck({
        idEmpleado: empleado._id,
        idPanel,
        fecha: fechaEvento,
      });

      await new Eventos({
        tipo_dispositivo: BIOSTAR_TIPO_DISPOSITIVO,
        id_empleado: empleado._id,
        img_usuario: empleado.img_usuario || "",
        id_panel: idPanel,
        tipo_check,
        qr: String(userCode),
        fecha_creacion: fechaEvento,
        fecha_panel_raw: eventId,
        comentario: `BIOSTAR_EVENT:${eventId}`,
      }).save();
    }
  } catch (error: any) {
    console.log("[BIOSTAR_EVENTS] Error sincronizando eventos:", error?.message || error);
  } finally {
    jobRunning = false;
  }
}
