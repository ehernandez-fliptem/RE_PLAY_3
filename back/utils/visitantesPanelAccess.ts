import { execFile } from "child_process";
import dayjs from "dayjs";
import crypto from "crypto";
import DispositivosHv from "../models/DispositivosHv";
import { CONFIG } from "../config";
import { decryptPassword } from "./utils";
import { fecha, log } from "../middlewares/log";

export type PanelAccessMode = "entrada" | "salida" | "ambos" | "ninguno";

type HvValidRange = {
  enable: boolean;
  beginTime: string;
  endTime: string;
};

export function generarCardCodeVisitante(id_visitante: number): string {
  const base36 = id_visitante.toString(36).toUpperCase().padStart(6, "0");
  const hash = crypto
    .createHash("sha256")
    .update(String(id_visitante))
    .digest("hex")
    .toUpperCase()
    .slice(0, 10);
  return `VST${base36}${hash}`;
}

export function calcEmployeeNoVisitante(id_visitante: number): string {
  return String(990000 + Number(id_visitante));
}

export function getPanelModeFromTipoEvento(tipo_evento?: number | null): Exclude<PanelAccessMode, "ninguno"> {
  if (Number(tipo_evento) === 5) return "entrada";
  if (Number(tipo_evento) === 6) return "salida";
  return "ambos";
}

export function panelModeMatches(target: PanelAccessMode, panelMode: Exclude<PanelAccessMode, "ninguno">): boolean {
  if (target === "ninguno") return false;
  if (target === "ambos") return true;
  return panelMode === target || panelMode === "ambos";
}

export function getPastValidRange(): HvValidRange {
  return {
    enable: true,
    beginTime: dayjs().subtract(4, "day").format("YYYY-MM-DDT00:00:00"),
    endTime: dayjs().subtract(3, "day").format("YYYY-MM-DDT23:59:59"),
  };
}

export function getTemporaryValidRange(minutes: number): HvValidRange {
  return {
    enable: true,
    beginTime: dayjs().subtract(1, "minute").format("YYYY-MM-DDTHH:mm:ss"),
    endTime: dayjs().add(minutes, "minute").format("YYYY-MM-DDTHH:mm:ss"),
  };
}

export function getTodayValidRange(): HvValidRange {
  return {
    enable: true,
    beginTime: dayjs().subtract(1, "minute").format("YYYY-MM-DDTHH:mm:ss"),
    endTime: dayjs().endOf("day").format("YYYY-MM-DDTHH:mm:ss"),
  };
}

const runCurl = (args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(
      "curl",
      args,
      { windowsHide: true, timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const out = String(stdout || "").trim();
        const errText = String(stderr || "").trim();
        if (err) return reject(new Error(errText || err.message));
        resolve(out);
      }
    );
  });

function hvLogError(stage: string, data: Record<string, unknown>) {
  log(`${fecha()} [HV_ACCESS][${stage}] ${JSON.stringify(data)}\n`);
}

async function hvSetValidOnPanel(panel: any, employeeNo: string, valid: HvValidRange): Promise<void> {
  const ip = panel.direccion_ip;
  const hvUser = panel.usuario || "admin";
  const hvPass = panel.contrasena ? decryptPassword(panel.contrasena, CONFIG.SECRET_CRYPTO) : "";

  await runCurl([
    "--silent", "--show-error", "--fail-with-body",
    "--connect-timeout", "1",
    "--max-time", "2",
    "--digest", "-u", `${hvUser}:${hvPass}`,
    "-X", "GET",
    `http://${ip}/ISAPI/System/deviceInfo`,
  ]);

  await runCurl([
    "--silent", "--show-error", "--fail-with-body",
    "--insecure",
    "--digest", "-u", `${hvUser}:${hvPass}`,
    "-H", "Content-Type: application/json",
    "-X", "PUT",
    `https://${ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`,
    "-d", JSON.stringify({
      UserInfo: {
        employeeNo,
        Valid: {
          enable: valid.enable,
          beginTime: valid.beginTime,
          endTime: valid.endTime,
          timeType: "local",
        },
      },
    }),
  ]);
}

export async function setVisitantePanelAccess(params: {
  id_visitante: number;
  target: PanelAccessMode;
  validRange?: HvValidRange;
}): Promise<{ total: number; actualizados: string[]; errores: Array<{ ip: string; message: string }> }> {
  const { id_visitante, target } = params;
  const employeeNo = calcEmployeeNoVisitante(id_visitante);
  const activeRange = params.validRange || getTodayValidRange();
  const disabledRange = getPastValidRange();
  const actualizados: string[] = [];
  const errores: Array<{ ip: string; message: string }> = [];

  const paneles = await DispositivosHv.find(
    { activo: true },
    { direccion_ip: 1, usuario: 1, contrasena: 1, tipo_evento: 1 }
  ).lean();

  const panelesOrdenados = [...paneles].sort((a: any, b: any) => {
    const aLocal = String(a.direccion_ip).startsWith("192.168.100.");
    const bLocal = String(b.direccion_ip).startsWith("192.168.100.");
    return Number(bLocal) - Number(aLocal);
  });

  for (const panel of panelesOrdenados as any[]) {
    const panelMode = getPanelModeFromTipoEvento(panel.tipo_evento);
    const valid = panelModeMatches(target, panelMode) ? activeRange : disabledRange;
    try {
      await hvSetValidOnPanel(panel, employeeNo, valid);
      actualizados.push(String(panel.direccion_ip));
    } catch (error: any) {
      hvLogError("SET_VALID_ERROR", {
        ip: panel.direccion_ip,
        employeeNo,
        target,
        panelMode,
        beginTime: valid.beginTime,
        endTime: valid.endTime,
        error: String(error?.message || error).slice(0, 500),
      });
      errores.push({ ip: String(panel.direccion_ip), message: String(error?.message || error).slice(0, 500) });
    }
  }

  return { total: panelesOrdenados.length, actualizados, errores };
}
