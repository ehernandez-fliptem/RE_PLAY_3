import axios from "axios";
import { clienteAxios } from "./axios";

/**
 * Cliente del Agente Biometrico local (BioMini Slim 2 en caseta).
 *
 * El agente corre en ESTA PC, no en el servidor. Por eso se le habla a
 * 127.0.0.1 con un axios propio, sin la baseURL ni los headers de sesion de
 * clienteAxios.
 *
 * El navegador permite que una pagina servida por HTTPS llame a http://127.0.0.1
 * (loopback cuenta como origen confiable), asi que el agente no necesita
 * certificado. Ver agente_biometrico/README.md.
 */

export type EstadoAgente = {
  disponible: boolean;
  conectado: boolean;
  sdkListo: boolean;
  modelo: string;
  serie: string;
  modo: string;
  plantillasCargadas: number;
  /** Que esta mal, en palabras para el operador de caseta. */
  problema?: string;
  /** Que hacer al respecto. */
  hint?: string;
};

export type IdentificacionAgente = {
  ok: boolean;
  identificado: boolean;
  personId?: string;
  calidad?: number;
  mensaje?: string;
  hint?: string;
};

const DESCONECTADO: EstadoAgente = {
  disponible: false,
  conectado: false,
  sdkListo: false,
  modelo: "",
  serie: "",
  modo: "",
  plantillasCargadas: 0,
  problema: "No se encontro el agente biometrico en esta computadora.",
  hint: "Verifica que el Agente Biometrico este abierto (icono en la barra de tareas) y que el BioMini este conectado por USB.",
};

/** Datos de sesion que el backend entrega para hablar con el agente. */
type SesionAgente = { token: string; expira: number; puerto: number };

let sesion: SesionAgente | null = null;

async function obtenerSesion(forzar = false): Promise<SesionAgente | null> {
  const ahora = Math.floor(Date.now() / 1000);
  // Se renueva 30s antes de expirar para no perder una lectura a media captura.
  if (!forzar && sesion && sesion.expira - 30 > ahora) return sesion;

  try {
    const res = await clienteAxios.get("/api/biometria-agente/token");
    if (!res.data?.estado) {
      sesion = null;
      return null;
    }
    sesion = res.data.datos as SesionAgente;
    return sesion;
  } catch {
    sesion = null;
    return null;
  }
}

function agenteAxios(puerto: number) {
  return axios.create({ baseURL: `http://127.0.0.1:${puerto}`, timeout: 40000 });
}

export function limpiarSesionAgente() {
  sesion = null;
}

/**
 * Estado del lector. Nunca lanza: si el agente no esta, devuelve el estado
 * desconectado con instrucciones, porque la pantalla de caseta debe seguir
 * funcionando con QR aunque la huella este caida.
 */
export async function obtenerEstadoAgente(): Promise<EstadoAgente> {
  const s = await obtenerSesion();
  if (!s) {
    return {
      ...DESCONECTADO,
      problema: "El lector de huella no esta configurado para este acceso.",
      hint: "Revisa que el servidor tenga AGENTE_BIOMETRICO_SECRET configurado y que tu usuario tenga un acceso asignado.",
    };
  }

  try {
    const { data } = await agenteAxios(s.puerto).get("/api/biometric/status", { timeout: 4000 });
    return {
      disponible: true,
      conectado: !!data.connected,
      sdkListo: !!data.sdkReady,
      modelo: data.deviceName || "",
      serie: data.serialNumber || "",
      modo: data.mode || "",
      plantillasCargadas: data.templates?.count ?? 0,
      problema: data.problem || undefined,
      hint: data.hint || undefined,
    };
  } catch {
    return DESCONECTADO;
  }
}

/**
 * Trae del backend las huellas del acceso y se las pasa al agente.
 * El paquete va cifrado de extremo a extremo: esta funcion lo mueve sin poder leerlo.
 */
export async function sincronizarPlantillas(): Promise<{ ok: boolean; cargadas?: number; mensaje?: string }> {
  const s = await obtenerSesion();
  if (!s) return { ok: false, mensaje: "El lector de huella no esta configurado para este acceso." };

  let bundle: string;
  try {
    const res = await clienteAxios.get("/api/biometria-agente/plantillas");
    if (!res.data?.estado) return { ok: false, mensaje: res.data?.mensaje || "No se pudieron obtener las huellas." };
    bundle = res.data.datos.bundle;
  } catch {
    return { ok: false, mensaje: "No se pudieron obtener las huellas del servidor." };
  }

  try {
    const { data } = await agenteAxios(s.puerto).post(
      "/api/biometric/templates",
      { bundle },
      { headers: { "x-agent-token": s.token } }
    );
    return data?.estado
      ? { ok: true, cargadas: data.cargadas }
      : { ok: false, mensaje: data?.mensaje || "El agente rechazo las huellas." };
  } catch {
    return { ok: false, mensaje: "No se pudo enviar las huellas al agente local." };
  }
}

/**
 * Espera una huella y la identifica contra las plantillas cargadas.
 * Bloquea hasta que alguien pone el dedo o se agota el tiempo.
 */
export async function identificar(): Promise<IdentificacionAgente> {
  const s = await obtenerSesion();
  if (!s) return { ok: false, identificado: false, mensaje: "El lector de huella no esta configurado." };

  try {
    const { data } = await agenteAxios(s.puerto).post(
      "/api/biometric/identify",
      {},
      { headers: { "x-agent-token": s.token } }
    );
    return {
      ok: !!data.estado,
      identificado: !!data.identificado,
      personId: data.personId || undefined,
      calidad: data.calidad,
      mensaje: data.mensaje || undefined,
      hint: data.hint || undefined,
    };
  } catch {
    return {
      ok: false,
      identificado: false,
      mensaje: "Se perdio la comunicacion con el lector.",
      hint: "Verifica que el Agente Biometrico siga abierto.",
    };
  }
}

export async function cancelarLectura(): Promise<void> {
  const s = await obtenerSesion();
  if (!s) return;
  try {
    await agenteAxios(s.puerto).post("/api/biometric/cancel", {}, { headers: { "x-agent-token": s.token } });
  } catch {
    // Cancelar es best-effort: si el agente ya no esta, no hay nada que cancelar.
  }
}
