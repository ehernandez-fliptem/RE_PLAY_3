import { spawnSync } from "child_process";
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

const SESSION_PATH = "../hikvision-auth/hv-session.json";
const AUTH_DIR = "../hikvision-auth";

function log(msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) console.log(`[${ts}] ${msg}`, extra);
  else console.log(`[${ts}] ${msg}`);
}

function loadSession(): AuthSession | null {
  try {
    const raw = fs.readFileSync(SESSION_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function testSession(session: AuthSession) {
  const url = `http://${session.ip}/ISAPI/System/deviceInfo?format=json`;

  log("Probando sesión contra:", url);

  const res = await fetch(url, {
    headers: {
      Cookie: session.webSession,
      ...(session.sessionTag ? { Sessiontag: session.sessionTag } : {}),
      ...(session.tokenValue ? { "X-CSRF-Token": session.tokenValue } : {})
    }
  });

  log("HTTP status:", res.status);
  return res.status;
}

function runAuth() {
  log("Ejecutando hikvision-auth...");

  const result = spawnSync("npm", ["run", "run"], {
    cwd: AUTH_DIR,
    stdio: "inherit",
    shell: true
  });

  if (result.status !== 0) {
    throw new Error("hikvision-auth falló");
  }
}

function runCore() {
  log("Ejecutando hikvision-core...");
  const result = spawnSync("npm", ["run", "run", "--", SESSION_PATH], {
    stdio: "inherit",
    shell: true
  });

  if (result.status !== 0) {
    throw new Error("hikvision-core falló");
  }
}

(async () => {
  log("Iniciando runner");

  let session = loadSession();

  if (!session) {
    log("No existe hv-session.json. Generando sesión...");
    runAuth();
    session = loadSession();
    if (!session) throw new Error("No se generó hv-session.json");
  }

  const status = await testSession(session);

  if (status === 401 || status === 403) {
    log("Sesión expirada. Regenerando...");
    runAuth();
  } else {
    log("Sesión válida.");
  }

  runCore();
})();