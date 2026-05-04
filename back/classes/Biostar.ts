import axios, { AxiosRequestConfig } from "axios";
import https from "https";
import DispositivosBiostar, { IDispositivoBiostar } from "../models/DispositivosBiostar";
import { decryptPassword } from "../utils/utils";
import { CONFIG } from "../config";

type LoginResult = {
  ok: boolean;
  sessionId?: string;
  message?: string;
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const SESSION_TTL_MS = 10 * 60 * 1000;

function getBaseURL(dispositivo: IDispositivoBiostar): string {
  return `https://${dispositivo.direccion_ip}:${dispositivo.puerto}`;
}

async function loginBiostar(dispositivo: IDispositivoBiostar): Promise<LoginResult> {
  try {
    const pass = decryptPassword(dispositivo.contrasena, CONFIG.SECRET_CRYPTO);
    const response = await axios.post(
      `${getBaseURL(dispositivo)}/api/login`,
      { User: { login_id: dispositivo.usuario, password: pass } },
      {
        timeout: 10000,
        httpsAgent,
        validateStatus: () => true,
      }
    );

    if (response.status !== 200) {
      return { ok: false, message: "No se pudo iniciar sesion en BioStar." };
    }

    const sessionId = String(response.headers["bs-session-id"] || "").trim();
    if (!sessionId) {
      return { ok: false, message: "BioStar no devolvio bs-session-id." };
    }

    return { ok: true, sessionId };
  } catch (error: any) {
    return { ok: false, message: error?.message || "Error de conexion con BioStar." };
  }
}

export async function ensureBiostarSession(dispositivo: IDispositivoBiostar): Promise<{ ok: boolean; sessionId?: string; message?: string }> {
  const now = Date.now();
  const expiresAt = dispositivo.session_expira ? new Date(dispositivo.session_expira).getTime() : 0;
  const hasSession = !!dispositivo.session_id;

  if (hasSession && expiresAt > now + 15_000) {
    return { ok: true, sessionId: dispositivo.session_id || "" };
  }

  const login = await loginBiostar(dispositivo);
  if (!login.ok || !login.sessionId) return login;

  const sessionExpira = new Date(Date.now() + SESSION_TTL_MS);
  await DispositivosBiostar.updateOne(
    { _id: dispositivo._id },
    { $set: { session_id: login.sessionId, session_expira: sessionExpira, fecha_modificacion: Date.now() } }
  );

  dispositivo.session_id = login.sessionId;
  dispositivo.session_expira = sessionExpira;

  return { ok: true, sessionId: login.sessionId };
}

export async function biostarRequest(
  dispositivo: IDispositivoBiostar,
  config: AxiosRequestConfig,
  retry = true
): Promise<{ ok: boolean; data?: any; status?: number; message?: string }> {
  const session = await ensureBiostarSession(dispositivo);
  if (!session.ok || !session.sessionId) {
    return { ok: false, message: session.message || "No se pudo obtener sesion de BioStar." };
  }

  try {
    const response = await axios.request({
      ...config,
      baseURL: getBaseURL(dispositivo),
      httpsAgent,
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {}),
        "bs-session-id": session.sessionId,
      },
    });

    const expiredByStatus = response.status === 401 || response.status === 419;
    const expiredByBody = String(response?.data?.Response?.code || "") === "10";

    if (retry && (expiredByStatus || expiredByBody)) {
      await DispositivosBiostar.updateOne(
        { _id: dispositivo._id },
        { $set: { session_id: "", session_expira: null } }
      );
      dispositivo.session_id = "";
      dispositivo.session_expira = null;
      return biostarRequest(dispositivo, config, false);
    }

    return { ok: response.status >= 200 && response.status < 300, data: response.data, status: response.status };
  } catch (error: any) {
    return { ok: false, message: error?.message || "Error al consumir BioStar." };
  }
}

export async function probarConexionBiostar(dispositivo: IDispositivoBiostar): Promise<{ ok: boolean; message: string }> {
  const login = await loginBiostar(dispositivo);
  if (!login.ok || !login.sessionId) {
    return { ok: false, message: login.message || "No se pudo conectar con BioStar." };
  }

  const sessionExpira = new Date(Date.now() + SESSION_TTL_MS);
  await DispositivosBiostar.updateOne(
    { _id: dispositivo._id },
    { $set: { session_id: login.sessionId, session_expira: sessionExpira, fecha_modificacion: Date.now() } }
  );

  return { ok: true, message: "Conexion establecida correctamente." };
}
