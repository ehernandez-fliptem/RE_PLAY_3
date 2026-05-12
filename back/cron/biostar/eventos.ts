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
const BIOSTAR_ACCESS_GRANTED_CODES = new Set([4864, 4865, 4866, 4867, 4868]);
const BIOSTAR_ACCESS_DENIED_CODES = new Set([5120, 5121, 5122, 5123, 5124, 5125, 5126, 5127, 6400, 6401]);

let jobRunning = false;

function getRows(payload: any): any[] {
  const rows = payload?.EventCollection?.rows;
  return Array.isArray(rows) ? rows : [];
}

function toNumber(val: unknown): number {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBiostarEventType(row: any): "ACCESS_GRANTED" | "ACCESS_DENIED" | "IGNORE" {
  const userCode = String(row?.user_id?.user_id || "").trim();
  if (!userCode) return "IGNORE";

  const eventCode = toNumber(row?.event_type_id?.code);
  if (BIOSTAR_ACCESS_GRANTED_CODES.has(eventCode)) return "ACCESS_GRANTED";
  if (BIOSTAR_ACCESS_DENIED_CODES.has(eventCode)) return "ACCESS_DENIED";
  return "IGNORE";
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
    const cicloInicio = Date.now();
    let totalRows = 0;
    let totalCandidatos = 0;
    let totalInsertados = 0;
    let omitidosIgnorados = 0;
    let omitidosDuplicados = 0;
    let omitidosSinEmpleado = 0;
    let omitidosSinPanelMap = 0;

    const conexion = await BiostarConexion.findOne({ activo: true })
      .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 });
    if (!conexion) {
      console.log("[BIOSTAR_EVENTS] Sin conexion global activa.");
      return;
    }

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

    const rows = getRows(response.data).sort((a, b) => toNumber(a?.id) - toNumber(b?.id));
    totalRows = rows.length;

    if (!rows.length) {
      console.log("[BIOSTAR_EVENTS] Sin eventos en ventana.", {
        ventanaSegundos: BIOSTAR_EVENT_POLL_WINDOW_SECONDS,
      });
      return;
    }

    const suprema = await DispositivosSuprema.find({ activo: true }, "_id nombre").lean<{ _id: Types.ObjectId; nombre?: string }[]>();
    const panelByName = new Map<string, Types.ObjectId>();
    suprema.forEach((d) => {
      const key = String(d.nombre || "").trim().toLowerCase();
      if (key) panelByName.set(key, d._id);
    });

    for (const row of rows) {
      const biostarEventType = getBiostarEventType(row);
      if (biostarEventType === "IGNORE") {
        omitidosIgnorados++;
        continue;
      }
      totalCandidatos++;

      const eventId = String(row?.id || "").trim();
      const userCode = toNumber(row?.user_id?.user_id);
      if (!eventId || !userCode) continue;

      const deviceName = String(row?.device_id?.name || "").trim().toLowerCase();
      let idPanel = panelByName.get(deviceName) || null;
      if (!idPanel && deviceName) {
        const fuzzy = Array.from(panelByName.entries()).find(([key]) => key.includes(deviceName) || deviceName.includes(key));
        if (fuzzy) idPanel = fuzzy[1];
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

      const empleado = await Empleados.findOne({ id_empleado: userCode }, "_id img_usuario").lean<{ _id: Types.ObjectId; img_usuario?: string }>();
      if (!empleado?._id) {
        omitidosSinEmpleado++;
        continue;
      }

      const fechaEvento = parseEventDate(row);
      const eventCode = toNumber(row?.event_type_id?.code);
      const tipo_check = biostarEventType === "ACCESS_DENIED"
        ? 7
        : await resolveTipoCheck({
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
        duplicados: omitidosDuplicados,
        sinEmpleado: omitidosSinEmpleado,
        sinPanelMap: omitidosSinPanelMap,
      },
      ventanaSegundos: BIOSTAR_EVENT_POLL_WINDOW_SECONDS,
      duracionMs: Date.now() - cicloInicio,
    });
  } catch (error: any) {
    console.log("[BIOSTAR_EVENTS] Error sincronizando eventos:", error?.message || error);
  } finally {
    jobRunning = false;
  }
}
