import fs from "fs";
import { fetch } from "undici";

type AuthSession = {
  ip: string;
  baseUrl: string;
  webSession: string;
  sessionTag: string;
  tokenValue: string;
  createdAtIso: string;
};

function log(step: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) console.log(`[${ts}] ${step}`, extra);
  else console.log(`[${ts}] ${step}`);
}

function loadSession(path: string): AuthSession {
  const raw = fs.readFileSync(path, "utf8");
  const s = JSON.parse(raw) as AuthSession;

  if (!s.webSession) throw new Error("hv-session.json inválido: falta webSession");
  if (!s.ip) throw new Error("hv-session.json inválido: falta ip");

  return s;
}

async function hikvisionGet(ip: string, session: AuthSession, endpoint: string) {
  const url = `http://${ip}${endpoint}`;
  const headers: Record<string, string> = {
    "Cookie": session.webSession
  };

  if (session.sessionTag) headers["Sessiontag"] = session.sessionTag;

  // Tu equipo puede requerir token en algún header específico (depende modelo/endpoint).
  // Aquí lo dejo en header genérico; si tu API real usa otro nombre, cámbialo.
  if (session.tokenValue) headers["X-CSRF-Token"] = session.tokenValue;

  log("GET", { url, hasSessionTag: !!session.sessionTag, hasToken: !!session.tokenValue });

  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text();

  log("HTTP", { status: res.status });
  return text;
}

async function main() {
  // Por defecto busca el hv-session.json al lado
  const sessionPath = process.argv[2] ?? "hv-session.json";
  const endpoint = process.argv[3] ?? "/ISAPI/System/deviceInfo?format=json";

  log("Leyendo sesión", sessionPath);
  const session = loadSession(sessionPath);

  log("Usando IP", session.ip);
  log("Endpoint", endpoint);

  const body = await hikvisionGet(session.ip, session, endpoint);
  console.log(body);
}

main().catch((e) => {
  log("ERROR", String(e));
  process.exit(1);
});