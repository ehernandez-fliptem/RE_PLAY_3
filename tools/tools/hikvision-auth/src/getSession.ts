import fs from "fs";
import puppeteer, { Page } from "puppeteer";
import { fetch } from "undici";
import path from "path";

type AuthSession = {
  ip: string;
  baseUrl: string;
  webSession: string;   // "WebSession_...=..."
  sessionTag: string;
  tokenValue: string;
  createdAtIso: string;
};

function log(step: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) console.log(`[${ts}] ${step}`, extra);
  else console.log(`[${ts}] ${step}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * CONFIG
 * Puedes cambiar por variables de entorno sin tocar código.
 */
const CONFIG = {
  //URL para pruebas del puppeteer
  DEVICE_URL:
    process.env.DEVICE_URL ??
    "https://172.18.0.31/doc/index.html#/portal/login",

  HV_USER: process.env.HV_USER ?? "admin",
  HV_PASS: process.env.HV_PASS ?? "Bardahl2025.",

  USER_SELECTOR: process.env.USER_SELECTOR ?? "",
  PASS_SELECTOR: process.env.PASS_SELECTOR ?? "",
  LOGIN_BUTTON_SELECTOR: process.env.LOGIN_BUTTON_SELECTOR ?? "",
  POST_LOGIN_WAIT_SELECTOR: process.env.POST_LOGIN_WAIT_SELECTOR ?? "",

  ROBUST_LOGIN: (process.env.ROBUST_LOGIN ?? "true").toLowerCase() === "true",

  // headless false para ver el navegador
  //HEADLESS: true
  HEADLESS: (process.env.HEADLESS ?? "false").toLowerCase() === "true" ? true : false
};

async function getTokenValue(ip: string, webSession: string, sessionTag: string): Promise<string> {
  const url = `http://${ip}/ISAPI/Security/token?format=json`;
  log("Pidiendo token ISAPI/Security/token...", { url });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Cookie: webSession,
      Sessiontag: sessionTag ?? ""
    }
  });

  const text = await res.text();
  log("Respuesta token HTTP", { status: res.status });

  try {
    const json = JSON.parse(text);
    const token = json?.Token?.value ?? "";
    if (!token) {
      log("Token JSON sin value (primeros 200 chars):", text.slice(0, 200));
    }
    return token;
  } catch {
    log("Token no vino en JSON (puede ser normal). Body (primeros 200 chars):", text.slice(0, 200));
    return "";
  }
}

async function waitForSpaRender(page: Page) {
  log("Esperando render de SPA en #app...");
  await page.waitForFunction(() => {
    const app = document.querySelector("#app");
    return app && (app.children?.length ?? 0) > 0;
  }, { timeout: 45000 });
  log("SPA renderizó contenido en #app");
}

async function dumpInputsAndButtons(page: Page) {
  const inputs = await page.evaluate(() => {
    const visible = (el: any) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return Array.from(document.querySelectorAll("input")).map((i) => ({
      type: i.getAttribute("type"),
      id: (i as HTMLInputElement).id,
      name: i.getAttribute("name"),
      class: (i as HTMLInputElement).className,
      placeholder: i.getAttribute("placeholder"),
      autocomplete: i.getAttribute("autocomplete"),
      visible: visible(i)
    }));
  });

  const buttons = await page.evaluate(() => {
    const visible = (el: any) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return Array.from(document.querySelectorAll("button")).map((b) => ({
      id: (b as HTMLButtonElement).id,
      class: (b as HTMLButtonElement).className,
      text: ((b.textContent || "").trim()),
      type: b.getAttribute("type"),
      visible: visible(b)
    }));
  });

  log("Inputs encontrados:", inputs);
  log("Buttons encontrados:", buttons);
}

async function robustLogin(page: Page, user: string, pass: string) {
  log("ROBUST_LOGIN: buscando inputs visibles (usuario/password)...");
  await page.waitForFunction(() => {
    const visible = (el: any) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const all = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
    const userInput = all.find(i => visible(i) && (i.type === "text" || i.type === "email" || i.type === "" || i.type === null));
    const passInput = all.find(i => visible(i) && i.type === "password");
    return !!userInput && !!passInput;
  }, { timeout: 45000 });

  const inputs = await page.$$("input");

  // Usuario
  let wroteUser = false;
  for (const input of inputs) {
    const info = await input.evaluate((i: any) => ({
      type: i.type,
      visible: !!(i.offsetWidth || i.offsetHeight || i.getClientRects().length),
    }));

    if (info.visible && (info.type === "text" || info.type === "email" || info.type === "")) {
      await input.click({ clickCount: 3 }).catch(() => null);
      await input.type(user, { delay: 25 });
      log("Usuario escrito en input tipo:", info.type);
      wroteUser = true;
      break;
    }
  }
  if (!wroteUser) throw new Error("ROBUST_LOGIN: No pude escribir usuario (no encontré input visible).");

  // Password
  let wrotePass = false;
  for (const input of inputs) {
    const info = await input.evaluate((i: any) => ({
      type: i.type,
      visible: !!(i.offsetWidth || i.offsetHeight || i.getClientRects().length),
    }));

    if (info.visible && info.type === "password") {
      await input.click({ clickCount: 3 }).catch(() => null);
      await input.type(pass, { delay: 25 });
      log("Password escrito.");
      wrotePass = true;
      break;
    }
  }
  if (!wrotePass) throw new Error("ROBUST_LOGIN: No pude escribir password (no encontré input password visible).");

  // Botón login (por texto, y si no, intenta submit)
  log("ROBUST_LOGIN: buscando botón login visible...");
  const buttons = await page.$$("button");
  let clicked = false;

  for (const btn of buttons) {
    const info = await btn.evaluate((b: any) => ({
      text: (b.textContent || "").trim().toLowerCase(),
      visible: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
      type: b.getAttribute("type")
    }));

    if (info.visible && (info.text.includes("login") || info.text.includes("log in") || info.text.includes("iniciar") || info.text.includes("sign in"))) {
      await btn.click();
      clicked = true;
      log("Click botón login por texto:", info.text);
      break;
    }
  }

  if (!clicked) {
    log("ROBUST_LOGIN: no encontré botón por texto. Intentando submit por Enter en password...");
    // Enter en password
    await page.keyboard.press("Enter");
    clicked = true;
  }

  // Espera un poquito a que procese
  await sleep(1500);
}

async function selectorLogin(page: Page, user: string, pass: string) {
  if (!CONFIG.USER_SELECTOR || !CONFIG.PASS_SELECTOR || !CONFIG.LOGIN_BUTTON_SELECTOR) {
    throw new Error("Faltan selectores. Define USER_SELECTOR, PASS_SELECTOR, LOGIN_BUTTON_SELECTOR o usa ROBUST_LOGIN=true.");
  }

  log("LOGIN por selectores:", {
    USER_SELECTOR: CONFIG.USER_SELECTOR,
    PASS_SELECTOR: CONFIG.PASS_SELECTOR,
    LOGIN_BUTTON_SELECTOR: CONFIG.LOGIN_BUTTON_SELECTOR
  });

  await page.waitForSelector(CONFIG.USER_SELECTOR, { timeout: 45000 });
  await page.click(CONFIG.USER_SELECTOR, { clickCount: 3 }).catch(() => null);
  await page.type(CONFIG.USER_SELECTOR, user, { delay: 25 });

  await page.waitForSelector(CONFIG.PASS_SELECTOR, { timeout: 45000 });
  await page.click(CONFIG.PASS_SELECTOR, { clickCount: 3 }).catch(() => null);
  await page.type(CONFIG.PASS_SELECTOR, pass, { delay: 25 });

  await page.click(CONFIG.LOGIN_BUTTON_SELECTOR);

  // Si tienes un selector que indique "ya logueado", úsalo. Si no, solo espera un poco.
  if (CONFIG.POST_LOGIN_WAIT_SELECTOR) {
    log("Esperando POST_LOGIN_WAIT_SELECTOR:", CONFIG.POST_LOGIN_WAIT_SELECTOR);
    await page.waitForSelector(CONFIG.POST_LOGIN_WAIT_SELECTOR, { timeout: 45000 });
  } else {
    await sleep(1500);
  }
}

async function run() {
  const baseUrl = CONFIG.DEVICE_URL;

  // Sacar IP de la URL
  const ip = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*/, "");
  log("Iniciando hikvision-auth", { baseUrl, ip, headless: CONFIG.HEADLESS, robust: CONFIG.ROBUST_LOGIN });

  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS,
    ignoreHTTPSErrors: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors"],
  } as any);


  try {
    const page = await browser.newPage();

      let webSessionFromHeaders = "";

      page.on("response", async (res) => {
        try {
          const headers = res.headers();
          const setCookie = headers["set-cookie"];
          if (setCookie && typeof setCookie === "string" && setCookie.includes("WebSession_")) {
            const first = setCookie.split(";")[0];
            webSessionFromHeaders = first;
            log("Set-Cookie capturado:", first);
          }
        } catch {}
      });

    page.setDefaultNavigationTimeout(45000);

    log("Abriendo URL...");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
/*
    setTimeout(() => {
    console.log("Pasaron 3 segundos");
    }, 3000);
*/
    await waitForSpaRender(page);

    // Log de inputs/buttons para que veas qué hay realmente
    await dumpInputsAndButtons(page);

    // Intentar login
    log("Iniciando login...");
    if (CONFIG.ROBUST_LOGIN) {
      await robustLogin(page, CONFIG.HV_USER, CONFIG.HV_PASS);
    } else {
      await selectorLogin(page, CONFIG.HV_USER, CONFIG.HV_PASS);
    }

    log("Esperando a que el login procese (3s)...");
    await sleep(3000);

    // Esperar a que aparezca la cookie
    log("Esperando cookies post-login...");
    await sleep(1500);

    log("Leyendo sessionTag desde sessionStorage (si existe)");
    const sessionTag = await page.evaluate(() => window.sessionStorage.getItem("sessionTag") || "");
    log("sessionTag:", sessionTag);

    log("Leyendo cookies y buscando WebSession_*");

    log("Leyendo cookies (page.cookies)...");
    // Importante: pedir cookies del host raíz ayuda mucho
    const origin = `https://${ip}/`;
    let cookies = await page.cookies(origin);

    // fallback por si el equipo responde en http
    if (!cookies || cookies.length === 0) {
      try {
        cookies = await page.cookies(`http://${ip}/`);
      } catch {}
    }

    log("Cookies encontradas:", cookies.map(c => c.name));

    // Busca cookie que contenga "websession" (con o sin underscore, may/min)
    const ws = cookies.find(c => /websession/i.test(c.name));
    let webSession = ws ? `${ws.name}=${ws.value}` : "";


    // Intento 2: header Set-Cookie capturado
    if (!webSession && webSessionFromHeaders) {
      webSession = webSessionFromHeaders;
      log("Usando WebSession desde headers:", webSession);
    }

    if (!webSession) {
      throw new Error(
        `No se encontró cookie tipo WebSession. Cookies visibles: [${cookies.map(c => c.name).join(", ")}].`
      );
    }


    log("WebSession encontrada:", webSession);

    const frames = page.frames().map(f => f.url());
    log("Frames detectados:", frames);


    let tokenValue = "";
    try {
      tokenValue = await getTokenValue(ip, webSession, sessionTag);
      log("tokenValue:", tokenValue ? "(ok)" : "(vacío)");
    } catch (e) {
      log("No se pudo obtener tokenValue (continuo igual).", String(e));
      tokenValue = "";
    }

    const session: AuthSession = {
      ip,
      baseUrl,
      webSession,
      sessionTag,
      tokenValue,
      createdAtIso: new Date().toISOString()
    };

    const outFile = path.resolve(process.cwd(), "hv-session.json");
    fs.writeFileSync(outFile, JSON.stringify(session, null, 2), "utf8");
    log("Guardado:", outFile);

    log("CWD:", process.cwd());

    log("OK. Cerrando navegador...");
    await browser.close();
    log("Listo.");
  } catch (e) {
    log("ERROR:", String(e));
    await browser.close().catch(() => null);
    process.exit(1);
  }
}

run();


