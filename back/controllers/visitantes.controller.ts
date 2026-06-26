import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Excel, { CellFormulaValue, CellHyperlinkValue, CellValue, Column } from 'exceljs';
import fs from 'fs';
import { Types, PipelineStage } from 'mongoose';
import QRCode from 'qrcode';
import { UserRequest } from '../types/express';
import { QueryParams } from '../types/queryparams';
import Visitantes, { IVisitante } from '../models/Visitantes';
import Configuracion from '../models/Configuracion';
import Roles from '../models/Roles';
import Usuarios from '../models/Usuarios';
import { generarCodigoUnico, isEmptyObject, resizeImage, customAggregationForDataGrids, columnToLetter, marcarDuplicados, decryptPassword } from '../utils/utils';
import { validarModelo } from '../validators/validadores';
import { enviarCorreoNuevoVisitanteHV, enviarCorreoUsuario, enviarCorreoUsuarioNuevaContrasena } from '../utils/correos';
import { fecha, log } from "../middlewares/log";

import { CONFIG } from "../config";

import FaceDetector from '../classes/FaceDetector';
import FaceDescriptors from '../models/FaceDescriptors';


//////
import path from "path";
import dayjs from "dayjs";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { execFile } from "child_process";
import DispositivosHv from "../models/DispositivosHv";
import crypto from "crypto";
import Eventos from "../models/Eventos";
import {
  setVisitantePanelAccess,
  getPastValidRange,
  getTemporaryValidRange,
  getTodayValidRange,
  type PanelAccessMode,
} from "../utils/visitantesPanelAccess";


// ===============================
// Helper CURL simple
// ===============================
function generarCardCodeDesdeId(id_visitante: number): string {
  // ID en base36 (letras + números)
  const base36 = id_visitante
    .toString(36)
    .toUpperCase()
    .padStart(6, "0"); // 6 chars

  // Hash corto y determinístico
  const hash = crypto
    .createHash("sha256")
    .update(String(id_visitante))
    .digest("hex")
    .toUpperCase()
    .slice(0, 10); // 10 chars

  // Prefijo fijo (4 chars)
  // TOTAL = 4 + 6 + 10 = 20
  return `VST${base36}${hash}`;
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

const tryParseJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const hvLogError = (stage: string, data: Record<string, unknown>) => {
  log(`${fecha()} [HV][${stage}] ${JSON.stringify(data)}\n`);
};

const isVehiculoVisitantesEnabled = async (): Promise<boolean> => {
  const cfg = await Configuracion.findOne(
    { activo: true },
    "habilitarVisitantesAvanzado habilitarVisitantesVehiculo"
  )
    .sort({ fecha_modificacion: -1, fecha_creacion: -1, _id: -1 })
    .lean<any>();
  return cfg?.habilitarVisitantesAvanzado !== false && cfg?.habilitarVisitantesVehiculo !== false;
};

async function syncVisitanteEnPaneles(params: {
  id_visitante: number;
  fullName: string;
  cardNo: string;
}): Promise<{
  ok: boolean;
  total: number;
  exitos: string[];
  errores: Array<{ ip: string; stage: string; message: string }>;
}> {
  const errores: Array<{ ip: string; stage: string; message: string }> = [];
  const exitos: string[] = [];
  const employeeNo = calcEmployeeNo(params.id_visitante);
  const cardNoPrimary = String(params.cardNo || "").trim();
  const cardNoFallback = String(employeeNo || "").trim();
  const { beginTime, endTime } = getPastValidRange();

  const paneles = await DispositivosHv.find(
    { activo: true },
    { direccion_ip: 1, usuario: 1, contrasena: 1 }
  ).lean();

  const panelesOrdenados = [...paneles].sort((a: any, b: any) => {
    const aLocal = String(a.direccion_ip).startsWith("192.168.100.");
    const bLocal = String(b.direccion_ip).startsWith("192.168.100.");
    return Number(bLocal) - Number(aLocal);
  });

  for (const panel of panelesOrdenados as any[]) {
    const ip = panel.direccion_ip;
    const hvUser = panel.usuario || "admin";
    const hvPass = panel.contrasena
      ? decryptPassword(panel.contrasena, CONFIG.SECRET_CRYPTO)
      : "";

    try {
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--connect-timeout","1",
        "--max-time","2",
        "--digest","-u", `${hvUser}:${hvPass}`,
        "-X","GET",
        `http://${ip}/ISAPI/System/deviceInfo`,
      ]);
    } catch {
      hvLogError("OFFLINE", {
        ip,
        employeeNo,
        cardNoPrimary,
        cardNoFallback,
      });
      errores.push({
        ip: String(ip),
        stage: "OFFLINE",
        message: "Panel fuera de linea o sin respuesta.",
      });
      continue;
    }

    try {
      const urlUser = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--digest","-u", `${hvUser}:${hvPass}`,
        "-H","Content-Type: application/json",
        "-X","POST",
        urlUser,
        "-d", JSON.stringify({
          UserInfo: {
            employeeNo,
            name: params.fullName || `Invitado ${employeeNo}`,
            userType: "visitor",
            userVerifyMode: "faceOrFpOrCardOrPw",
            Valid: { enable: true, beginTime, endTime },
          },
        }),
      ]);

      const urlCard = `http://${ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
      const tryAddCard = async (cardNoValue: string) => {
        if (!cardNoValue) return;
        await runCurl([
          "--silent","--show-error","--fail-with-body",
          "--digest","-u", `${hvUser}:${hvPass}`,
          "-H","Content-Type: application/json",
          "-X","POST",
          urlCard,
          "-d", JSON.stringify({
            CardInfo: { employeeNo, cardNo: cardNoValue, cardType: "normalCard" },
          }),
        ]);
      };

      try {
        await tryAddCard(cardNoPrimary);
      } catch (e: any) {
        hvLogError("WARN_CARD_PRIMARY", {
          ip,
          employeeNo,
          cardNo: cardNoPrimary,
          error: String(e?.message || e).slice(0, 200),
        });
      }

      if (cardNoFallback && cardNoFallback !== cardNoPrimary) {
        try {
          await tryAddCard(cardNoFallback);
        } catch (e: any) {
          hvLogError("WARN_CARD_FALLBACK", {
            ip,
            employeeNo,
            cardNo: cardNoFallback,
            error: String(e?.message || e).slice(0, 200),
          });
        }
      }

      const urlModify = `https://${ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
      await runCurl([
        "--silent","--show-error","--fail-with-body",
        "--insecure",
        "--digest","-u", `${hvUser}:${hvPass}`,
        "-H","Content-Type: application/json",
        "-X","PUT",
        urlModify,
        "-d", JSON.stringify({
          UserInfo: {
            employeeNo,
            name: params.fullName || `Invitado ${employeeNo}`,
            userType: "visitor",
            Valid: { enable: true, beginTime, endTime, timeType: "local" },
            RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
            doorRight: "1",
            userVerifyMode: "faceOrFpOrCardOrPw",
          },
        }),
      ]);
    } catch (e: any) {
      hvLogError("SYNC_ERROR", {
        ip,
        employeeNo,
        beginTime,
        endTime,
        error: String(e?.message || e).slice(0, 500),
      });
      errores.push({
        ip: String(ip),
        stage: "SYNC_ERROR",
        message: String(e?.message || e).slice(0, 500),
      });
      continue;
    }

    exitos.push(String(ip));
  }

  return {
    ok: panelesOrdenados.length === 0 || exitos.length > 0,
    total: panelesOrdenados.length,
    exitos,
    errores,
  };
}

const DOC_CHECK_KEYS = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
] as const;

type DocChecks = Record<(typeof DOC_CHECK_KEYS)[number], boolean>;

const normalizeDocChecks = (value?: Partial<DocChecks> | null): DocChecks => ({
  identificacion_oficial: Boolean(value?.identificacion_oficial),
  sua: Boolean(value?.sua),
  permiso_entrada: Boolean(value?.permiso_entrada),
  lista_articulos: Boolean(value?.lista_articulos),
});

const areDocChecksComplete = (value?: Partial<DocChecks> | null): boolean =>
  DOC_CHECK_KEYS.every((key) => Boolean(value?.[key]));

const didDocChecksChange = (
  prev?: Partial<DocChecks> | null,
  next?: Partial<DocChecks> | null
): boolean => {
  const a = normalizeDocChecks(prev);
  const b = normalizeDocChecks(next);
  return DOC_CHECK_KEYS.some((key) => a[key] !== b[key]);
};

const ACCESS_MINUTES = 5;
type OcrVariant = { name: string; buffer: Buffer };
type OcrAttempt = { variant: OcrVariant; psm: number; lang?: string };
const ocrWorkerPromises = new Map<string, Promise<any>>();
const ocrWorkerQueues = new Map<string, Promise<void>>();

function ocrTraceId(): string {
  return `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function logOcrStep(traceId: string, step: string, data: Record<string, unknown> = {}) {
  log(`${fecha()} [VISITANTES][OCR][${traceId}][${step}] ${JSON.stringify(data)}\n`);
}

function summarizeOcrText(text: string) {
  const tokens = identityTokens(text);
  return {
    chars: String(text || "").length,
    lines: String(text || "").split(/\r?\n/).filter(Boolean).length,
    tokenCount: tokens.length,
    tokens: tokens.slice(0, 20),
  };
}

function normalizeIdentityText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatPersonNamePart(value: unknown): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part ? `${part.charAt(0).toLocaleUpperCase("es-MX")}${part.slice(1)}` : "")
    .join(" ");
}

function identityTokens(value: unknown): string[] {
  const stop = new Set([
    "NOMBRE", "CREDENCIAL", "PARA", "VOTAR", "INSTITUTO", "NACIONAL", "ELECTORAL",
    "MEXICO", "DOMICILIO", "SEXO", "FECHA", "NACIMIENTO", "CLAVE", "ELECTOR",
    "CURP", "ESTADO", "MUNICIPIO", "SECCION", "LOCALIDAD", "EMISION", "VIGENCIA",
    "REGISTRO", "DIRECCION", "COLONIA", "CALLE", "ANO", "VALIDA",
    "IDENTIFICACION", "OFICIAL", "ESTADOS", "UNIDOS", "MEXICANOS",
  ]);
  return Array.from(new Set(
    normalizeIdentityText(value)
      .split(" ")
      .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !stop.has(token))
  ));
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a))) return 0.9;

  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - levenshteinDistance(a, b) / maxLen : 0;
}

function compareIdentity(systemName: string, ocrText: string) {
  const expected = identityTokens(systemName);
  const found = identityTokens(ocrText);
  const matched = expected.filter((token) =>
    found.some((candidate) => tokenSimilarity(token, candidate) >= 0.82)
  );
  const required =
    expected.length <= 1 ? expected.length : expected.length === 2 ? 2 : Math.ceil(expected.length * 0.67);
  return {
    ok: required > 0 && matched.length >= required,
    expected,
    found,
    matched,
    required,
    score: expected.length ? matched.length / expected.length : 0,
  };
}

function decodeBase64Image(img: string, traceId = ""): Buffer {
  const raw = String(img || "");
  const base64 = raw.includes("base64,") ? raw.split("base64,").pop() || "" : raw;
  if (traceId) {
    logOcrStep(traceId, "decode:start", {
      hasDataUrlHeader: raw.includes("base64,"),
      rawChars: raw.length,
      base64Chars: base64.length,
    });
  }
  if (!base64.trim()) throw new Error("La imagen de INE viene vacia.");

  const imgBuffer = Buffer.from(base64, "base64");
  if (traceId) {
    logOcrStep(traceId, "decode:buffer", {
      bytes: imgBuffer.length,
      kb: Math.round(imgBuffer.length / 1024),
    });
  }
  if (imgBuffer.length < 1024) throw new Error("La imagen de INE no es valida.");
  if (imgBuffer.length > 12 * 1024 * 1024) throw new Error("La imagen de INE es demasiado pesada.");

  return imgBuffer;
}

function normalizeOcrOutput(value: string): string {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

async function buildIneOcrVariants(imgBuffer: Buffer, traceId = ""): Promise<OcrVariant[]> {
  const metadata = await sharp(imgBuffer).rotate().metadata();
  if (!metadata.width || !metadata.height) throw new Error("No se pudo leer la imagen de INE.");
  if (traceId) {
    logOcrStep(traceId, "image:metadata", {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      orientation: metadata.orientation,
      space: metadata.space,
      channels: metadata.channels,
    });
  }

  const base = sharp(imgBuffer).rotate();
  const safeExtract = (region: { left: number; top: number; width: number; height: number }) => {
    const left = Math.max(0, Math.min(metadata.width! - 1, Math.round(region.left)));
    const top = Math.max(0, Math.min(metadata.height! - 1, Math.round(region.top)));
    const width = Math.max(1, Math.min(metadata.width! - left, Math.round(region.width)));
    const height = Math.max(1, Math.min(metadata.height! - top, Math.round(region.height)));
    return { left, top, width, height };
  };
  const fromRegion = (x: number, y: number, width: number, height: number) =>
    safeExtract({
      left: metadata.width! * x,
      top: metadata.height! * y,
      width: metadata.width! * width,
      height: metadata.height! * height,
    });

  const makeVariant = async (
    name: string,
    region: ReturnType<typeof safeExtract> | null,
    mode: "normal" | "contrast" | "threshold",
    resizeWidth: number
  ): Promise<OcrVariant> => {
    let image = base.clone();
    if (region) image = image.extract(region);
    image = image.resize({ width: resizeWidth, fit: "inside", withoutEnlargement: false }).greyscale().normalize().sharpen();
    if (mode === "contrast") image = image.linear(1.35, -18).normalize().sharpen();
    if (mode === "threshold") image = image.threshold(150);
    return {
      name,
      buffer: await image.jpeg({ quality: 92 }).toBuffer(),
    };
  };

  const variants: OcrVariant[] = [
    await makeVariant("full_normal", null, "normal", 1600),
    await makeVariant("full_threshold", null, "threshold", 1600),
    await makeVariant("card_text_contrast", fromRegion(0.14, 0.18, 0.70, 0.60), "contrast", 1500),
    await makeVariant("name_block_contrast", fromRegion(0.325, 0.385, 0.36, 0.13), "contrast", 1600),
    await makeVariant("name_block_normal", fromRegion(0.325, 0.385, 0.36, 0.13), "normal", 1600),
    await makeVariant("name_wide_contrast", fromRegion(0.27, 0.28, 0.46, 0.26), "contrast", 1400),
    await makeVariant("name_photo_contrast", fromRegion(0.30, 0.36, 0.42, 0.18), "contrast", 1400),
    await makeVariant("name_tight_normal", fromRegion(0.32, 0.38, 0.32, 0.12), "normal", 1300),
    await makeVariant("center_text_normal", fromRegion(0.28, 0.34, 0.56, 0.38), "normal", 1500),
  ];
  if (traceId) {
    const variantMeta = await Promise.all(
      variants.map(async (variant, index) => {
        const item = await sharp(variant.buffer).metadata();
        return {
          index,
          name: variant.name,
          bytes: variant.buffer.length,
          kb: Math.round(variant.buffer.length / 1024),
          width: item.width,
          height: item.height,
        };
      })
    );
    logOcrStep(traceId, "image:variants", { variants: variantMeta });
  }
  return variants;
}

function getTesseractLangPath(lang: string) {
  const code = lang === "eng" ? "eng" : "spa";
  return path.join(process.cwd(), "node_modules", "@tesseract.js-data", code, "4.0.0");
}

async function getOcrWorker(lang: string) {
  const code = lang === "eng" ? "eng" : "spa";
  if (!ocrWorkerPromises.has(code)) {
    const cachePath = path.join(process.cwd(), "temp", "tesseract-cache");
    fs.mkdirSync(cachePath, { recursive: true });
    ocrWorkerPromises.set(
      code,
      createWorker(code, 1, {
        langPath: getTesseractLangPath(code),
        cachePath,
        gzip: true,
      })
    );
  }
  return ocrWorkerPromises.get(code)!;
}

async function withOcrWorker<T>(lang: string, action: (worker: any) => Promise<T>): Promise<T> {
  const code = lang === "eng" ? "eng" : "spa";
  const previous = ocrWorkerQueues.get(code) || Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  ocrWorkerQueues.set(
    code,
    previous.catch(() => undefined).then(() => current)
  );
  await previous.catch(() => undefined);
  try {
    const worker = await getOcrWorker(code);
    return await action(worker);
  } finally {
    release();
  }
}

async function runTesseract(buffer: Buffer, psm: number, lang = "spa", traceId = "", attemptIndex = 0, variantName = ""): Promise<string> {
  await fs.promises.mkdir(path.join(process.cwd(), "temp"), { recursive: true });
  const inputPath = path.join(process.cwd(), "temp", `ine-ocr-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`);
  await fs.promises.writeFile(inputPath, buffer);
  const startedAt = Date.now();
  if (traceId) {
    logOcrStep(traceId, "tesseract:start", {
      attempt: attemptIndex,
      psm,
      lang,
      inputBytes: buffer.length,
      inputKb: Math.round(buffer.length / 1024),
      variant: variantName,
      tempFile: path.basename(inputPath),
    });
  }
  try {
    const text = await withOcrWorker(lang, async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: String(psm),
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      const result = await worker.recognize(inputPath);
      return String(result?.data?.text || "");
    });
    const normalized = normalizeOcrOutput(text);
    if (traceId) {
      logOcrStep(traceId, "tesseract:done", {
        attempt: attemptIndex,
        psm,
        lang,
        ms: Date.now() - startedAt,
        variant: variantName,
        ...summarizeOcrText(normalized),
      });
    }
    return normalized;
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
  }
}

async function runOcrAttempt(
  attempt: OcrAttempt,
  traceId = "",
  attemptIndex = 0
): Promise<string> {
  return Promise.race([
    runTesseract(attempt.variant.buffer, attempt.psm, attempt.lang, traceId, attemptIndex, attempt.variant.name),
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("Tiempo agotado al leer la INE.")), 28000);
    }),
  ]);
}

function hasEnoughIdentityText(text: string): boolean {
  return identityTokens(text).length >= 2;
}

async function extractIneText(img: string, expectedName = "", traceId = ""): Promise<string> {
  logOcrStep(traceId, "extract:start", {
    hasExpectedName: Boolean(expectedName),
    expectedTokens: identityTokens(expectedName),
  });
  const imgBuffer = decodeBase64Image(img, traceId);
  const variants = await buildIneOcrVariants(imgBuffer, traceId);
  const byName = new Map(variants.map((variant) => [variant.name, variant]));
  const attempts: OcrAttempt[] = [
    { variant: byName.get("name_block_contrast") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("name_block_normal") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("name_wide_contrast") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("name_tight_normal") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("center_text_normal") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("card_text_contrast") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("full_threshold") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("full_normal") || variants[0], psm: 6, lang: "spa" },
    { variant: byName.get("name_photo_contrast") || variants[0], psm: 6, lang: "eng" },
  ];
  const texts: string[] = [];

  for (const [index, attempt] of attempts.entries()) {
    try {
      logOcrStep(traceId, "attempt:before", {
        attempt: index + 1,
        psm: attempt.psm,
        lang: attempt.lang,
        variant: attempt.variant.name,
        variantBytes: attempt.variant.buffer.length,
      });
      const text = await runOcrAttempt(attempt, traceId, index + 1);
      if (text && identityTokens(text).length > 0) texts.push(text);
      const mergedAttempt = texts.join("\n");
      const currentComparison = expectedName ? compareIdentity(expectedName, mergedAttempt) : null;
      logOcrStep(traceId, "attempt:after", {
        attempt: index + 1,
        acceptedText: Boolean(text && identityTokens(text).length > 0),
        merged: summarizeOcrText(mergedAttempt),
        comparison: currentComparison
          ? {
              ok: currentComparison.ok,
              matched: currentComparison.matched,
              required: currentComparison.required,
              score: currentComparison.score,
            }
          : null,
      });
      if (expectedName && currentComparison?.ok) {
        logOcrStep(traceId, "attempt:stop", { reason: "identity_match", attempt: index + 1 });
        break;
      }
      if (!expectedName && hasEnoughIdentityText(mergedAttempt)) {
        logOcrStep(traceId, "attempt:stop", { reason: "enough_text", attempt: index + 1 });
        break;
      }
    } catch (error: any) {
      logOcrStep(traceId, "attempt:error", {
        attempt: index + 1,
        psm: attempt.psm,
        lang: attempt.lang,
        variant: attempt.variant.name,
        message: error?.message || String(error),
      });
    }
  }

  const merged = Array.from(
    new Set(
      texts
        .join("\n")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  ).join("\n");

  if (!hasEnoughIdentityText(merged)) {
    logOcrStep(traceId, "extract:not_enough_text", { merged: summarizeOcrText(merged) });
    throw new Error("No se pudo extraer texto suficiente de la INE. Intenta con mejor luz y la credencial completa dentro del rectangulo.");
  }

  logOcrStep(traceId, "extract:done", { merged: summarizeOcrText(merged) });
  return merged;
}

type IneNameData = {
  nombre: string;
  apellido_pat: string;
  apellido_mat: string;
  source: string;
};

const INE_NAME_STOP_HEADERS = new Set([
  "NOMBRE",
  "NUMBRE",
  "DOMICILIO",
  "SEXO",
  "FECHA DE NACIMIENTO",
  "FECHA",
  "CLAVE DE ELECTOR",
  "CLAVE",
  "CURP",
  "ANO DE REGISTRO",
  "AÑO DE REGISTRO",
  "REGISTRO",
  "SECCION",
  "SECCIÓN",
  "VIGENCIA",
]);

const INE_NAME_NOISE_TOKENS = new Set([
  "MY",
  "MN",
  "MM",
  "AA",
  "AY",
  "UN",
  "EL",
  "ESO",
  "NETA",
  "NEAL",
  "SOTO",
]);

function isIneNameHeader(line: string): boolean {
  const [firstToken] = normalizeIdentityText(line).split(" ").filter(Boolean);
  return Boolean(firstToken) && tokenSimilarity(firstToken, "NOMBRE") >= 0.78;
}

function isIneStopHeader(line: string): boolean {
  const normalized = normalizeIdentityText(line);
  return [...INE_NAME_STOP_HEADERS].some((header) => normalized === header || normalized.startsWith(`${header} `));
}

function cleanIneNameCandidateLine(line: string): string {
  let normalized = normalizeIdentityText(line);
  for (const header of INE_NAME_STOP_HEADERS) {
    const index = normalized.indexOf(header);
    if (index === 0) return "";
    if (index > 0) normalized = normalized.slice(0, index).trim();
  }
  const tokens = normalized
    .split(" ")
    .filter((token) =>
      token.length > 2 &&
      /^[A-ZÑ]+$/.test(token) &&
      !INE_NAME_STOP_HEADERS.has(token) &&
      !INE_NAME_NOISE_TOKENS.has(token)
    );
  if (!tokens.length || tokens.length > 4) return "";
  return tokens.join(" ");
}

function cleanIneNameLine(line: string): string {
  return normalizeIdentityText(line)
    .replace(/\s+/g, " ")
    .trim();
}

function parseIneNameBlock(ocrText: string): IneNameData | null {
  const lines = String(ocrText || "")
    .split(/\r?\n/)
    .map((line) => cleanIneNameLine(line))
    .filter(Boolean);

  const nameIndex = lines.findIndex((line) => isIneNameHeader(line));
  const candidates: string[] = [];

  if (nameIndex >= 0) {
    const sameLine = lines[nameIndex].split(" ").slice(1).join(" ").trim();
    const sameLineName = cleanIneNameCandidateLine(sameLine);
    if (sameLineName) candidates.push(sameLineName);

    for (let index = nameIndex + 1; index < lines.length && candidates.length < 3; index += 1) {
      const line = lines[index];
      if (isIneStopHeader(line)) break;
      const candidate = cleanIneNameCandidateLine(line);
      if (candidate) candidates.push(candidate);
    }
  }

  if (candidates.length < 3) {
    for (let index = 0; index <= lines.length - 3; index += 1) {
      const block = lines.slice(index, index + 3).map(cleanIneNameCandidateLine);
      if (block.every(Boolean)) {
        const after = lines[index + 3] || "";
        if (after === "DOMICILIO" || after.startsWith("DOMICILIO ")) {
          candidates.splice(0, candidates.length, ...block);
          break;
        }
      }
    }
  }

  if (candidates.length < 3) return null;
  return {
    apellido_pat: formatPersonNamePart(candidates[0]),
    apellido_mat: formatPersonNamePart(candidates[1]),
    nombre: formatPersonNamePart(candidates[2]),
    source: candidates.slice(0, 3).join(" | "),
  };
}

function inferIdentityDataFromIne(params: {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  ocrText: string;
}): IneNameData | null {
  const parsed = parseIneNameBlock(params.ocrText);
  if (!parsed) return null;

  const currentTokens = identityTokens(`${params.nombre} ${params.apellido_pat}`);
  const parsedTokens = identityTokens(`${parsed.nombre} ${parsed.apellido_pat} ${parsed.apellido_mat}`);
  const matchedCurrent = currentTokens.filter((token) =>
    parsedTokens.some((candidate) => tokenSimilarity(token, candidate) >= 0.82)
  );
  const minimumMatches = currentTokens.length <= 1 ? 2 : Math.min(2, currentTokens.length);
  if (!currentTokens.length || matchedCurrent.length < minimumMatches) return null;

  return parsed;
}

function accessStateForMode(mode: PanelAccessMode): "entrada_autorizada" | "salida_autorizada" | "cerrado" {
  if (mode === "entrada" || mode === "ambos") return "entrada_autorizada";
  if (mode === "salida") return "salida_autorizada";
  return "cerrado";
}

///// bloquear y desbloquear visitantes
    function getHoyRangoLocal() {
    // Ventana amplia para evitar desfases de zona horaria.
    // Abarca desde ayer 00:00 hasta dentro de 2 días 23:59:59.
    const beginTime = dayjs().subtract(1, "day").format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().add(2, "day").format("YYYY-MM-DDT23:59:59");
    return { beginTime, endTime };
    }

    function getRangoPasado(diasAtras = 3) {
    // endTime varios días atrás -> ya expiró
    const beginTime = dayjs().subtract(diasAtras + 1, "day").format("YYYY-MM-DDT00:00:00");
    const endTime = dayjs().subtract(diasAtras, "day").format("YYYY-MM-DDT23:59:59");
    return { beginTime, endTime };
    }

    function calcEmployeeNo(id_visitante: number) {
    const base = 990000;
    return String(base + Number(id_visitante));
    }

    /**
     * Actualiza vigencia en Hikvision (UserInfo/Modify) para un employeeNo
     * - Intenta en todos los paneles activos
     * - Los paneles caídos se omiten
     */
    async function hvSetValidForEmployee(employeeNo: string, valid: { enable: boolean; beginTime: string; endTime: string }) {
    const paneles = await DispositivosHv.find(
        { activo: true },
        { direccion_ip: 1, usuario: 1, contrasena: 1 }
    ).lean();

    const panelesOrdenados = [...paneles].sort((a: any, b: any) => {
        const aLocal = String(a.direccion_ip).startsWith("192.168.100.");
        const bLocal = String(b.direccion_ip).startsWith("192.168.100.");
        return Number(bLocal) - Number(aLocal);
    });

    for (const panel of panelesOrdenados as any[]) {
        const ip = panel.direccion_ip;
        const hvUser = panel.usuario || "admin";
        const hvPass = panel.contrasena
            ? decryptPassword(panel.contrasena, CONFIG.SECRET_CRYPTO)
            : "";

        // quick check
        try {
        await runCurl([
            "--silent", "--show-error", "--fail-with-body",
            "--connect-timeout", "1",
            "--max-time", "2",
            "--digest", "-u", `${hvUser}:${hvPass}`,
            "-X", "GET",
            `http://${ip}/ISAPI/System/deviceInfo`,
        ]);
        } catch {
        hvLogError("MODIFY_OFFLINE", {
            ip,
            employeeNo,
            beginTime: valid.beginTime,
            endTime: valid.endTime,
        });
        continue;
        }

        // modify
        const urlModify = `https://${ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;

        const payload = {
        UserInfo: {
            employeeNo,
            Valid: {
            enable: valid.enable,
            beginTime: valid.beginTime,
            endTime: valid.endTime,
            timeType: "local",
            },
        },
        };

        try {
        await runCurl([
            "--silent", "--show-error", "--fail-with-body",
            "--insecure",
            "--digest", "-u", `${hvUser}:${hvPass}`,
            "-H", "Content-Type: application/json",
            "-X", "PUT",
            urlModify,
            "-d", JSON.stringify(payload),
        ]);
        } catch (e: any) {
        // seguimos con el siguiente panel
        hvLogError("MODIFY_ERROR", {
            ip,
            employeeNo,
            beginTime: valid.beginTime,
            endTime: valid.endTime,
            error: String(e?.message || e).slice(0, 500),
        });
        }
    }
    }
/////

const faceDetector = new FaceDetector();

export async function obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
        const estadoFiltro = String((req.query as any)?.estado || "activos").trim().toLowerCase();
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["id_visitante", "empresa", "nombre"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        estadoFiltro === "inactivos" ? { activo: false } : estadoFiltro === "todos" ? {} : { activo: true },
                        { eliminado_permanente: { $ne: true } },
                    ],
                },
            },
            {
                $set: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                    bloqueado: {
                        $cond: {
                            if: { $eq: ["$token_bloqueo", ""] },
                            then: false,
                            else: true
                        }
                    },
                    img_usuario: {
                        $cond: {
                            if: { $eq: ["$img_usuario", ""] },
                            then: false,
                            else: true
                        }
                    },
                    sync_hikvision_pendiente: {
                        $ifNull: ["$sync_hikvision_pendiente", false]
                    },
                }
            },
            {
                $project: {
                    codigo: 0,
                    apellido_pat: 0,
                    apellido_mat: 0,
                    contrasena: 0,
                    telefono: 0,
                    correo: 0,
                    token_web: 0,
                    token_app: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                    documentos: 0,
                }
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB
                }
            });
        }
        aggregation.push(
            {
                $sort: sortMDB ? sortMDB : { id_visitante: 1 }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        )
        const registros = await Visitantes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

// RE_PLAY_3/back/controllers/visitantes.controller.ts

export async function obtenerGrid(req: Request, res: Response): Promise<void> {
    try {
        const estadoFiltro = String((req.query as any)?.estado || "activos").trim().toLowerCase();
        const { filter = "{}", pagination = "{}", sort = "{}" } = req.query as any;

        const queryFilter = JSON.parse(filter);
        const querySort = JSON.parse(sort);
        const queryPagination = JSON.parse(pagination);

        const { filter: filterMDB, sort: sortMDB, pagination: paginationMDB } =
        customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["id_visitante", "empresa", "nombre"]
        );

        const aggregation: PipelineStage[] = [
        {
            $match: {
            $and: [
                estadoFiltro === "inactivos" ? { activo: false } : estadoFiltro === "todos" ? {} : { activo: true },
                { eliminado_permanente: { $ne: true } },
            ],
            },
        },
        {
            $set: {
            // nombre completo
            nombre: {
                $trim: {
                input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] },
                },
            },

            // img_usuario boolean
            img_usuario: {
                $cond: {
                if: { $or: [{ $eq: ["$img_usuario", ""] }, { $eq: ["$img_usuario", null] }] },
                then: false,
                else: true,
                },
            },

            // ---- FIX DEFINITIVO ----
            // Si viene string → Date
            // Si ya es Date → se queda
            // Si no existe → null
            desbloqueado_hasta: {
                $cond: [
                { $eq: [{ $type: "$desbloqueado_hasta" }, "string"] },
                { $toDate: "$desbloqueado_hasta" },
                "$desbloqueado_hasta",
                ],
            },

            // bloqueado seguro
            bloqueado: {
                $ifNull: [
                "$bloqueado",
                {
                    $cond: {
                    if: {
                        $and: [
                        { $ne: ["$token_bloqueo", null] },
                        { $ne: ["$token_bloqueo", ""] },
                        ],
                    },
                    then: true,
                    else: false,
                    },
                },
                ],
            },
            sync_hikvision_pendiente: {
                $ifNull: ["$sync_hikvision_pendiente", false],
            },
            },
        },

        {
            $project: {
            codigo: 0,
            apellido_pat: 0,
            apellido_mat: 0,
            contrasena: 0,
            telefono: 0,
            correo: 0,
            token_web: 0,
            token_app: 0,
            token_bloqueo: 0,
            intentos: 0,
            fecha_creacion: 0,
            creado_por: 0,
            fecha_modificacion: 0,
            modificado_por: 0,
            documentos: 0,
            },
        },
        ];

        if (filterMDB?.length) {
        aggregation.push({ $match: { $or: filterMDB } });
        }

        aggregation.push(
        { $sort: sortMDB || { id_visitante: 1 } },
        {
            $facet: {
            paginatedResults: [
                { $skip: paginationMDB.skip },
                { $limit: paginationMDB.limit },
            ],
            totalCount: [{ $count: "count" }],
            },
        }
        );

        const registros = await Visitantes.aggregate(aggregation);
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        console.error(error);
        res.status(500).send({
        estado: false,
        mensaje: `${error.name}: ${error.message}`,
        });
    }
}



export async function obtenerTodosActivos(req: Request, res: Response): Promise<void> {
    try {
        const { filter, pagination, sort } = req.query as { filter: string; pagination: string; sort: string; };
        const queryFilter = JSON.parse(filter) as QueryParams["filter"];
        const querySort = JSON.parse(sort) as QueryParams["sort"];
        const queryPagination = JSON.parse(pagination) as QueryParams["pagination"];

        const {
            filter: filterMDB,
            sort: sortMDB,
            pagination: paginationMDB
        } = customAggregationForDataGrids(
            queryFilter,
            querySort,
            queryPagination,
            ["nombre", "puesto", "correo", "telefono", "movil"]
        );
        const aggregation: PipelineStage[] = [
            {
                $match: {
                    $and: [
                        { activo: true },
                    ]
                }
            },
            {
                $project: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                }
            },
        ];
        if (filterMDB.length > 0) {
            aggregation.push({
                $match: {
                    $or: filterMDB
                }
            });
        }
        aggregation.push(
            {
                $sort: sortMDB ? sortMDB : { id_general: 1 }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: paginationMDB.skip }, { $limit: paginationMDB.limit }],
                    totalCount: [
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        )
        const registros = await Visitantes.aggregate(aggregation)
        res.status(200).json({ estado: true, datos: registros[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerUno(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Visitantes.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'creado_por',
                    foreignField: '_id',
                    as: 'creado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                },
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'modificado_por',
                    foreignField: '_id',
                    as: 'modificado_por',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $trim: {
                                        input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                                    }
                                },
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "pisos",
                    localField: "id_piso",
                    foreignField: "_id",
                    as: "piso",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "id_acceso",
                    foreignField: "_id",
                    as: "acceso",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $set: {
                    piso: { $arrayElemAt: ['$piso', 0] },
                    acceso: { $arrayElemAt: ['$acceso', 0] },
                    creado_por: { $arrayElemAt: ['$creado_por', 0] },
                    modificado_por: { $arrayElemAt: ['$modificado_por', 0] },
                }
            },
            {
                $set: {
                    nombre: {
                        $trim: {
                            input: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }
                        }
                    },
                    piso: {
                        $trim: {
                            input: { $concat: ["$piso.identificador", " - ", "$piso.nombre"] }
                        }
                    },
                    acceso: {
                        $trim: {
                            input: { $concat: ["$acceso.identificador", " - ", "$acceso.nombre"] }
                        }
                    },
                    creado_por: "$creado_por.nombre",
                    modificado_por: "$modificado_por.nombre",
                }
            },
            {
                $project: {
                    rolNombres: 0,
                    contrasena: 0,
                    token_app: 0,
                    token_web: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    id_piso: 0,
                    id_acceso: 0,
                    id_empresa: 0,
                    id_horario: 0,
                    arco: 0,
                    usuario: 0
                }
            }
        ]);
        if (!registro[0]) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }
        res.status(200).json({ estado: true, datos: registro[0] });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function obtenerFormEditarVisitante(req: Request, res: Response): Promise<void> {
    try {
        const visitante = await Visitantes.aggregate([
            {
                $match: {
                    $and: [
                        { _id: new Types.ObjectId(req.params.id) },
                    ]
                }
            },
            {
                $project: {
                    contrasena: 0,
                    token_app: 0,
                    token_web: 0,
                    token_bloqueo: 0,
                    intentos: 0,
                    fecha_creacion: 0,
                    creado_por: 0,
                    fecha_modificacion: 0,
                    modificado_por: 0,
                    activo: 0,
                }
            }
        ]);
        if (!visitante[0]) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }
        res.status(200).json({ estado: true, datos: { visitante: visitante[0] } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};


/**
 * CREAR VISITANTE
 * - Guarda visitante
 * - Genera card_code determinístico desde id_visitante
 * - Sincroniza con paneles HV
 * - NO genera QR aquí (eso lo hace obtenerQR)
 */
export async function crear(req: Request, res: Response): Promise<void> {
    console.log("[CREAR] Inicio");

    const t0 = Date.now();
    const lap = (msg: string, extra?: any) => {
        const ms = Date.now() - t0;
        if (extra !== undefined) console.log(`[CREAR][+${ms}ms] ${msg}`, extra);
        else console.log(`[CREAR][+${ms}ms] ${msg}`);
    };

    try {
        const {
        img_usuario,
        img_ine,
        nombre,
        apellido_pat,
        apellido_mat,
        empresa,
        telefono,
        correo,
        contrasena,
        documentos_checks,
        viene_en_coche,
        archivo_licencia,
        archivo_poliza_seguro,
        archivo_tarjeta_circulacion,
        } = req.body;

        const id_usuario = (req as UserRequest).userId;

        // 1) Correo único
        const existe = await Usuarios.findOne({ correo }, "_id").lean();
        if (existe) {
        res.status(400).json({ estado: false, mensaje: "Ya existe un usuario con este correo." });
        return;
        }
        lap("correo único");

        // 2) Hash contraseña
        const hash = bcrypt.hashSync(contrasena, 10);
        if (!hash) {
        res.status(500).json({ estado: false, mensaje: "Error al generar contraseña." });
        return;
        }
        lap("hash ok");

        // 3) Validar documentos
        const normalizedDocChecks = normalizeDocChecks(documentos_checks);
        if (!areDocChecksComplete(normalizedDocChecks)) {
        res.status(400).json({
            estado: false,
            mensaje: "Debes marcar todos los documentos requeridos.",
        });
        return;
        }
        const vehiculoVisitantesEnabled = await isVehiculoVisitantesEnabled();
        const vieneEnCoche = vehiculoVisitantesEnabled && Boolean(viene_en_coche);
        if (vieneEnCoche) {
        if (!String(archivo_licencia || "").trim()) {
            res.status(400).json({ estado: false, mensaje: "La licencia es obligatoria cuando viene en coche." });
            return;
        }
        if (!String(archivo_poliza_seguro || "").trim()) {
            res.status(400).json({ estado: false, mensaje: "La póliza de seguro es obligatoria cuando viene en coche." });
            return;
        }
        }

        // 4) Preparar imagen UNA sola vez
        lap("resizeImage start");
        const imgResized = await resizeImage(img_usuario);
        const imgIneResized = await resizeImage(img_ine);
        lap("resizeImage done", { hasImg: !!imgResized });

        // 5) Crear visitante (SIN card_code aún)
        const nuevo = new Visitantes({
        contrasena: hash,
        img_usuario: imgResized,
        img_ine: imgIneResized,
        nombre,
        apellido_pat,
        apellido_mat,
        empresa,
        telefono,
        correo,
        documentos_checks: normalizedDocChecks,
        viene_en_coche: vieneEnCoche,
        archivo_licencia: vieneEnCoche ? String(archivo_licencia || "") : "",
        archivo_poliza_seguro: vieneEnCoche ? String(archivo_poliza_seguro || "") : "",
        archivo_tarjeta_circulacion: vieneEnCoche ? String(archivo_tarjeta_circulacion || "") : "",
        creado_por: id_usuario,
        });

        // 6) Validar modelo
        const errores = await validarModelo(nuevo);
        if (!isEmptyObject(errores)) {
        res.status(400).json({ estado: false, mensajes: errores });
        return;
        }

        // 7) Guardar en BD (aquí se genera id_visitante)
        const reg_saved = await nuevo.save();

        lap("mongo save ok", {
        _id: String(reg_saved._id),
        id_visitante: reg_saved.id_visitante,
        });

        // 8) Generar card_code + verificar + sincronizar con panel
        const fullName = `${nombre ?? ""} ${apellido_pat ?? ""} ${apellido_mat ?? ""}`
          .replace(/\s+/g, " ")
          .trim();
        const cardNo = generarCardCodeDesdeId(Number(reg_saved.id_visitante));
        const closedDate = dayjs().subtract(3, "day").endOf("day").toDate();

        await Visitantes.updateOne(
          { _id: reg_saved._id },
          {
            $set: {
              card_code: cardNo,
              verificado: true,
              bloqueado: true,
              desbloqueado_hasta: closedDate,
              acceso_qr_estado: "cerrado",
              acceso_qr_modo: "",
              acceso_qr_expira: null,
            },
          }
        );

        const syncRes = await syncVisitanteEnPaneles({
          id_visitante: Number(reg_saved.id_visitante),
          fullName,
          cardNo,
        });
        const syncPendiente = syncRes.errores.length > 0;
        await Visitantes.updateOne(
          { _id: reg_saved._id },
          {
            $set: {
              sync_hikvision_pendiente: syncPendiente,
              sync_hikvision_error: syncPendiente
                ? `Pendiente en: ${syncRes.errores.map((e) => e.ip).filter(Boolean).join(", ")}`
                : "",
            },
          }
        );

        let correoEnviado = false;
        try {
          const qrDataUrl = await QRCode.toDataURL(String(cardNo), {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 500,
            margin: 2,
          });
          correoEnviado = await enviarCorreoNuevoVisitanteHV(
            correo,
            fullName,
            qrDataUrl
          );
          log(`${fecha()} INFO: Crear visitante correo HV. visitante=${String(reg_saved._id)} correo=${String(correo || "")} enviado=${correoEnviado}\n`);
        } catch (e: any) {
          log(`${fecha()} ERROR: Crear visitante correo HV. visitante=${String(reg_saved._id)} correo=${String(correo || "")} error=${String(e?.message || e)}\n`);
        }

        // 9) Respuesta
        res.status(200).json({
          estado: true,
          mensaje:
            syncRes.errores.length > 0
              ? `Visitante creado. Subido en ${syncRes.exitos.length}/${syncRes.total} panel(es).`
              : "Visitante creado y sincronizado en paneles.",
          datos: {
            _id: String(reg_saved._id),
            id_visitante: reg_saved.id_visitante,
            card_code: cardNo,
            correoEnviado,
            sync: {
              total: syncRes.total,
              subidos: syncRes.exitos,
              fallidos: syncRes.errores,
            },
          },
        });

  } catch (error: any) {
    console.log("[CREAR] ERROR:", error?.message || error);
    res.status(500).json({ estado: false, mensaje: "Error interno." });
  }
}

export async function verificar(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "Falta el id del visitante." });
      return;
    }

    const visitante = await Visitantes.findById(id, "_id id_visitante nombre apellido_pat apellido_mat correo card_code documentos_checks verificado bloqueado desbloqueado_hasta").lean<any>();
    if (!visitante) {
      res.status(404).json({ estado: false, mensaje: "Visitante no encontrado." });
      return;
    }

    if (!areDocChecksComplete(visitante.documentos_checks)) {
      res.status(200).json({
        estado: false,
        mensaje: "No puedes verificar un visitante sin todos los documentos.",
      });
      return;
    }

    const fullName = `${visitante.nombre ?? ""} ${visitante.apellido_pat ?? ""} ${visitante.apellido_mat ?? ""}`
      .replace(/\s+/g, " ")
      .trim();

    let cardNo = String(visitante.card_code || "").trim();
    if (!cardNo) {
      cardNo = generarCardCodeDesdeId(Number(visitante.id_visitante));
    }

    const closedDate = dayjs().subtract(3, "day").endOf("day").toDate();

    await Visitantes.updateOne(
      { _id: visitante._id },
      {
        $set: {
          card_code: cardNo,
          verificado: true,
          bloqueado: true,
          desbloqueado_hasta: closedDate,
          acceso_qr_estado: "cerrado",
          acceso_qr_modo: "",
          acceso_qr_expira: null,
        },
      }
    );

    try {
      const qrDataUrl = await QRCode.toDataURL(String(cardNo), {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 500,
        margin: 2,
      });
      const okMail = await enviarCorreoNuevoVisitanteHV(
        visitante.correo,
        fullName,
        qrDataUrl
      );
      log(`${fecha()} INFO: Verificar visitante correo HV. visitante=${String(visitante._id)} correo=${String(visitante.correo || "")} enviado=${okMail}\n`);
    } catch (e: any) {
      log(`${fecha()} ERROR: Verificar visitante correo HV. visitante=${String(visitante._id)} correo=${String(visitante.correo || "")} error=${String(e?.message || e)}\n`);
    }

    const syncRes = await syncVisitanteEnPaneles({
      id_visitante: Number(visitante.id_visitante),
      fullName,
      cardNo,
    });
    const syncPendiente = syncRes.errores.length > 0;
    await Visitantes.updateOne(
      { _id: visitante._id },
      {
        $set: {
          sync_hikvision_pendiente: syncPendiente,
          sync_hikvision_error: syncPendiente
            ? `Pendiente en: ${syncRes.errores.map((e) => e.ip).filter(Boolean).join(", ")}`
            : "",
        },
      }
    );

    res.status(200).json({
      estado: true,
      mensaje:
        syncRes.errores.length > 0
          ? `Visitante verificado. Subido en ${syncRes.exitos.length}/${syncRes.total} panel(es).`
          : "Visitante verificado y sincronizado en paneles.",
      datos: {
        _id: String(visitante._id),
        verificado: true,
        card_code: cardNo,
        bloqueado: true,
        desbloqueado_hasta: closedDate,
        sync: {
          total: syncRes.total,
          subidos: syncRes.exitos,
          fallidos: syncRes.errores,
        },
      },
    });
  } catch (error: any) {
    console.log("[VERIFICAR] ERROR:", error?.message || error);
    res.status(500).json({ estado: false, mensaje: "Error interno." });
  }
}

export async function autorizarAccesoQr(req: Request, res: Response): Promise<void> {
  const traceId = ocrTraceId();
  try {
    const id_usuario = (req as UserRequest).userId;
    const {
      qr,
      modo = "entrada",
      img_ine,
      motivo = "",
      guardar_ine = true,
      actualizar_datos = true,
    } = req.body as {
      qr?: string;
      modo?: PanelAccessMode;
      img_ine?: string;
      motivo?: string;
      guardar_ine?: boolean;
      actualizar_datos?: boolean;
    };

    const qrValue = String(qr || "").trim();
    logOcrStep(traceId, "request:start", {
      userId: id_usuario,
      modo,
      qrPrefix: qrValue.slice(0, 6),
      qrLength: qrValue.length,
      hasIne: Boolean(String(img_ine || "").trim()),
      ineChars: String(img_ine || "").length,
      guardar_ine,
      actualizar_datos,
    });
    if (!/^VST[A-Z0-9]{16}$/.test(qrValue)) {
      logOcrStep(traceId, "request:invalid_qr", { qrLength: qrValue.length });
      res.status(400).json({ estado: false, mensaje: "QR invalido o no corresponde a un visitante." });
      return;
    }

    const accessMode = String(modo || "entrada") as PanelAccessMode;
    if (!["entrada", "salida", "ambos"].includes(accessMode)) {
      logOcrStep(traceId, "request:invalid_mode", { accessMode });
      res.status(400).json({ estado: false, mensaje: "Modo de acceso invalido." });
      return;
    }

    const visitante = await Visitantes.findOne(
      { card_code: qrValue },
      "_id id_visitante nombre apellido_pat apellido_mat activo verificado bloqueado img_ine acceso_qr_estado acceso_qr_expira"
    ).lean<any>();
    if (!visitante) {
      logOcrStep(traceId, "visitor:not_found", { qrPrefix: qrValue.slice(0, 6) });
      res.status(404).json({ estado: false, mensaje: "Visitante no encontrado." });
      return;
    }
    logOcrStep(traceId, "visitor:loaded", {
      id: String(visitante._id),
      id_visitante: visitante.id_visitante,
      activo: visitante.activo,
      verificado: visitante.verificado,
      bloqueado: visitante.bloqueado,
      hasStoredIne: Boolean(String(visitante.img_ine || "").trim()),
      acceso_qr_estado: visitante.acceso_qr_estado,
      acceso_qr_expira: visitante.acceso_qr_expira,
    });
    if (!visitante.activo) {
      logOcrStep(traceId, "visitor:inactive");
      res.status(200).json({ estado: false, mensaje: "Visitante inactivo." });
      return;
    }
    if (!visitante.verificado) {
      logOcrStep(traceId, "visitor:not_verified");
      res.status(200).json({ estado: false, mensaje: "El visitante no esta verificado." });
      return;
    }

    const fullName = `${visitante.nombre || ""} ${visitante.apellido_pat || ""} ${visitante.apellido_mat || ""}`
      .replace(/\s+/g, " ")
      .trim();

    let ocrText = "";
    let comparison: ReturnType<typeof compareIdentity> | null = null;
    const requiresIne = accessMode === "entrada" || accessMode === "ambos";
    logOcrStep(traceId, "flow:mode", {
      accessMode,
      requiresIne,
      fullNameChars: fullName.length,
      expectedTokens: identityTokens(fullName),
    });
    if (requiresIne) {
      if (!String(img_ine || "").trim()) {
        logOcrStep(traceId, "ine:missing");
        res.status(200).json({ estado: false, requiere_ine: true, mensaje: "Para activar entrada se debe capturar la INE." });
        return;
      }
      try {
        ocrText = await extractIneText(String(img_ine), fullName, traceId);
      } catch (error: any) {
        logOcrStep(traceId, "ine:extract_error", { message: error?.message || String(error) });
        res.status(200).json({ estado: false, mensaje: `No se pudo leer la INE: ${error?.message || error}` });
        return;
      }
      comparison = compareIdentity(fullName, ocrText);
      logOcrStep(traceId, "ine:comparison", {
        ok: comparison.ok,
        expected: comparison.expected,
        found: comparison.found.slice(0, 30),
        matched: comparison.matched,
        required: comparison.required,
        score: comparison.score,
      });
      if (!comparison.ok) {
        logOcrStep(traceId, "ine:rejected", { reason: "identity_mismatch" });
        res.status(200).json({
          estado: false,
          mensaje: "La identificacion no coincide con el visitante del QR.",
          datos: {
            visitante: fullName,
            ocr: ocrText,
            coincidencias: comparison,
          },
        });
        return;
      }
    }

    if (accessMode === "salida") {
      const ultimaEntrada = await Eventos.findOne({
        id_visitante: visitante._id,
        tipo_check: 5,
      }).sort({ fecha_creacion: -1 }).lean<any>();
      const ultimaSalida = await Eventos.findOne({
        id_visitante: visitante._id,
        tipo_check: 6,
      }).sort({ fecha_creacion: -1 }).lean<any>();
      logOcrStep(traceId, "exit:previous_events", {
        hasEntrada: Boolean(ultimaEntrada),
        entradaFecha: ultimaEntrada?.fecha_creacion,
        hasSalida: Boolean(ultimaSalida),
        salidaFecha: ultimaSalida?.fecha_creacion,
      });
      if (!ultimaEntrada || (ultimaSalida && dayjs(ultimaSalida.fecha_creacion).isAfter(dayjs(ultimaEntrada.fecha_creacion)))) {
        logOcrStep(traceId, "exit:rejected_no_open_visit");
        res.status(200).json({ estado: false, mensaje: "No se puede activar salida sin una entrada previa pendiente de salida." });
        return;
      }
    }

    const validRange = accessMode === "salida" ? getTodayValidRange() : getTemporaryValidRange(ACCESS_MINUTES);
    logOcrStep(traceId, "panel:sync_start", { accessMode, validRange });
    const panelSync = await setVisitantePanelAccess({
      id_visitante: Number(visitante.id_visitante),
      target: accessMode,
      validRange,
    });
    logOcrStep(traceId, "panel:sync_done", {
      total: panelSync.total,
      actualizados: panelSync.actualizados?.length,
      errores: panelSync.errores?.map((item: any) => ({ ip: item.ip, error: item.error || item.message || item.mensaje })).slice(0, 10),
    });
    const expira = dayjs(validRange.endTime).toDate();
    const updateData: Record<string, unknown> = {
      bloqueado: false,
      desbloqueado_hasta: expira,
      acceso_qr_estado: accessStateForMode(accessMode),
      acceso_qr_modo: accessMode,
      acceso_qr_expira: expira,
      acceso_qr_autorizado_por: id_usuario,
      acceso_qr_motivo: String(motivo || "").trim(),
      acceso_qr_ocr_texto: ocrText,
      fecha_modificacion: new Date(),
      modificado_por: id_usuario,
    };
    if (requiresIne && guardar_ine && String(img_ine || "").trim() && !String(visitante.img_ine || "").trim()) {
      logOcrStep(traceId, "db:save_ine_start");
      updateData.img_ine = await resizeImage(String(img_ine));
      logOcrStep(traceId, "db:save_ine_done");
    }
    if (requiresIne && actualizar_datos) {
      const ineNameData = inferIdentityDataFromIne({
        nombre: visitante.nombre,
        apellido_pat: visitante.apellido_pat,
        apellido_mat: visitante.apellido_mat,
        ocrText,
      });
      if (ineNameData) {
        updateData.nombre = ineNameData.nombre;
        updateData.apellido_pat = ineNameData.apellido_pat;
        updateData.apellido_mat = ineNameData.apellido_mat;
        logOcrStep(traceId, "db:infer_identity", {
          inferred: true,
          source: ineNameData.source,
          nombre: ineNameData.nombre,
          apellido_pat: ineNameData.apellido_pat,
          apellido_mat: ineNameData.apellido_mat,
        });
      } else {
        logOcrStep(traceId, "db:infer_identity", { inferred: false, reason: "name_block_not_found" });
      }
    }

    logOcrStep(traceId, "db:update_start", { fields: Object.keys(updateData) });
    await Visitantes.updateOne({ _id: visitante._id }, { $set: updateData });
    logOcrStep(traceId, "db:update_done");

    logOcrStep(traceId, "request:success", { accessMode, expira, panelTotal: panelSync.total });
    res.status(200).json({
      estado: true,
      mensaje:
        accessMode === "salida"
          ? "Salida habilitada para paneles de salida."
          : `Entrada habilitada por ${ACCESS_MINUTES} minutos.`,
      datos: {
        id_visitante: visitante._id,
        nombre: fullName,
        modo: accessMode,
        expira,
        ocr: ocrText,
        coincidencias: comparison,
        paneles: panelSync,
      },
    });
  } catch (error: any) {
    logOcrStep(traceId, "request:error", { name: error?.name, message: error?.message || String(error) });
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function resincronizarVisitantePaneles(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "Falta el id del visitante." });
      return;
    }

    const visitante = await Visitantes.findById(
      id,
      "_id id_visitante nombre apellido_pat apellido_mat card_code"
    ).lean<any>();

    if (!visitante) {
      res.status(404).json({ estado: false, mensaje: "Visitante no encontrado." });
      return;
    }

    const fullName = `${visitante.nombre ?? ""} ${visitante.apellido_pat ?? ""} ${visitante.apellido_mat ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
    const cardNo = String(visitante.card_code || "").trim() || generarCardCodeDesdeId(Number(visitante.id_visitante));

    const syncRes = await syncVisitanteEnPaneles({
      id_visitante: Number(visitante.id_visitante),
      fullName,
      cardNo,
    });
    const syncPendiente = syncRes.errores.length > 0;
    await Visitantes.updateOne(
      { _id: visitante._id },
      {
        $set: {
          sync_hikvision_pendiente: syncPendiente,
          sync_hikvision_error: syncPendiente
            ? `Pendiente en: ${syncRes.errores.map((e) => e.ip).filter(Boolean).join(", ")}`
            : "",
        },
      }
    );

    res.status(200).json({
      estado: true,
      mensaje:
        syncRes.errores.length > 0
          ? `Subido en ${syncRes.exitos.length}/${syncRes.total} panel(es).`
          : "Sincronizacion completada en paneles.",
      datos: {
        _id: String(visitante._id),
        sync: {
          total: syncRes.total,
          subidos: syncRes.exitos,
          fallidos: syncRes.errores,
        },
      },
    });
  } catch (error: any) {
    console.log("[RESYNC_VISITANTE] ERROR:", error?.message || error);
    res.status(500).json({ estado: false, mensaje: "Error interno." });
  }
}



/**
 * OBTENER QR DEL VISITANTE
 * - QR = card_code
 * - card_code es determinístico (derivado de id_visitante)
 * - Visitantes viejos se corrigen automáticamente
 * - NO genera valores aleatorios
 */
export async function obtenerQR(req: Request, res: Response): Promise<void> {
    try {
        // El id DEL VISITANTE debe venir en la ruta: /obtenerQR/:id
        const { id } = req.params;

        if (!id) {
        res.status(400).json({
            estado: false,
            mensaje: "Falta el id del visitante.",
        });
        return;
        }

        // Traemos solo lo necesario
        const visitante = await Visitantes.findById(
        id,
        "id_visitante card_code verificado"
        ).lean();

        if (!visitante) {
        res.status(404).json({
            estado: false,
            mensaje: "Visitante no encontrado.",
        });
        return;
        }

        // ⬇️ Cast puntual para TypeScript (lean + mongoose)
        const { card_code, id_visitante, verificado } = visitante as any;

        if (!verificado) {
        res.status(403).json({
            estado: false,
            mensaje: "El visitante no está verificado.",
        });
        return;
        }

        let cardCode = String(card_code || "").trim();

        /**
         * VISITANTE VIEJO
         * - No tenía card_code porque se creó antes
         * - Se RECONSTRUYE desde id_visitante (NO se inventa)
         */
        if (!cardCode) {
        cardCode = generarCardCodeDesdeId(id_visitante);

        await Visitantes.updateOne(
            { _id: id },
            { $set: { card_code: cardCode } }
        );

        console.log("[OBTENER_QR] card_code reconstruido:", cardCode);
        }

        // QR = card_code (MISMO valor que la tarjeta)
        const qr = await QRCode.toDataURL(cardCode, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 400,
        margin: 2,
        });

        res.status(200).json({
        estado: true,
        datos: qr,
        cardCode,
        });
    } catch (error: any) {
        console.log("[OBTENER_QR] ERROR:", error?.message || error);
        res.status(500).json({
        estado: false,
        mensaje: error?.message || "Error interno.",
        });
    }
    }

export async function reenviarCorreoAcceso(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const visitante = await Visitantes.findById(
            req.params.id,
            "_id id_visitante card_code verificado correo nombre apellido_pat apellido_mat"
        ).lean<any>();

        if (!visitante) {
            res.status(200).json({ estado: false, mensaje: "Visitante no encontrado." });
            return;
        }

        if (!visitante.verificado) {
            res.status(200).json({
                estado: false,
                mensaje: "El visitante no está verificado. Verifícalo antes de reenviar el correo.",
            });
            return;
        }

        let cardCode = String(visitante.card_code || "").trim();
        if (!cardCode) {
            cardCode = generarCardCodeDesdeId(visitante.id_visitante);
            await Visitantes.updateOne({ _id: visitante._id }, { $set: { card_code: cardCode } });
        }

        const qrDataUrl = await QRCode.toDataURL(cardCode, {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 400,
            margin: 2,
        });

        const nombreCompleto = [visitante.nombre, visitante.apellido_pat, visitante.apellido_mat]
            .filter(Boolean)
            .join(" ");

        const correoEnviado = await enviarCorreoNuevoVisitanteHV(
            String(visitante.correo || ""),
            nombreCompleto,
            qrDataUrl
        );

        log(
            `${fecha()} INFO: Reenviar correo visitante. solicitante=${id_usuario} visitante=${String(
                visitante._id
            )} correo=${String(visitante.correo || "")} enviado=${correoEnviado}\n`
        );

        if (!correoEnviado) {
            res.status(200).json({ estado: false, mensaje: "No se pudo reenviar el correo del visitante." });
            return;
        }

        res.status(200).json({ estado: true, mensaje: "Correo reenviado correctamente." });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificar(req: Request, res: Response): Promise<void> {
    try {
        const {
            img_usuario, img_ine, nombre, apellido_pat, apellido_mat, empresa, telefono, correo, contrasena, documentos_checks,
            viene_en_coche, archivo_licencia, archivo_poliza_seguro, archivo_tarjeta_circulacion
        } = req.body;
        const id_usuario = (req as UserRequest).userId;

        const existe_usuario = await Usuarios.findOne({ correo }, '_id');
        if (existe_usuario) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: { correo: "Ya existe un usuario con este correo en el sistema." } });
            return;
        }

        const registroPrev = await Visitantes.findById(
            req.params.id,
            "_id documentos_checks verificado id_visitante"
        ).lean<any>();
        if (!registroPrev) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }

        const docChecksProvided = documentos_checks !== undefined;
        const normalizedDocChecks = docChecksProvided ? normalizeDocChecks(documentos_checks) : null;
        const docChecksChanged = docChecksProvided
            ? didDocChecksChange(registroPrev.documentos_checks, normalizedDocChecks)
            : false;
        const requiereReverificacion = Boolean(registroPrev.verificado) && docChecksChanged;

        let bloqueadoUpdate: { bloqueado?: boolean; desbloqueado_hasta?: Date | null } = {};
        if (requiereReverificacion) {
            const { beginTime, endTime } = getRangoPasado();
            bloqueadoUpdate = {
                bloqueado: true,
                desbloqueado_hasta: new Date(endTime),
            };
            const employeeNo = calcEmployeeNo(Number(registroPrev.id_visitante));
            await hvSetValidForEmployee(employeeNo, { enable: true, beginTime, endTime });
        }

        const vehiculoVisitantesEnabled = await isVehiculoVisitantesEnabled();
        const vieneEnCoche = vehiculoVisitantesEnabled && Boolean(viene_en_coche);
        if (vieneEnCoche) {
            if (!String(archivo_licencia || "").trim()) {
                res.status(400).json({ estado: false, mensaje: "La licencia es obligatoria cuando viene en coche." });
                return;
            }
            if (!String(archivo_poliza_seguro || "").trim()) {
                res.status(400).json({ estado: false, mensaje: "La póliza de seguro es obligatoria cuando viene en coche." });
                return;
            }
        }

        let updateData = {
            img_usuario: await resizeImage(img_usuario),
            img_ine: await resizeImage(img_ine),
            nombre,
            apellido_pat,
            apellido_mat,
            empresa,
            telefono,
            correo,
            contrasena,
            fecha_modificacion: Date.now(),
            modificado_por: id_usuario,
            viene_en_coche: vieneEnCoche,
            archivo_licencia: vieneEnCoche ? String(archivo_licencia || "") : "",
            archivo_poliza_seguro: vieneEnCoche ? String(archivo_poliza_seguro || "") : "",
            archivo_tarjeta_circulacion: vieneEnCoche ? String(archivo_tarjeta_circulacion || "") : "",
            ...(docChecksProvided ? { documentos_checks: normalizedDocChecks } : {}),
            ...(requiereReverificacion ? { verificado: false } : {}),
            ...bloqueadoUpdate,
        }
        if (contrasena) {
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                res.status(200).json({ estado: false, mensaje: 'Hubo un error al generar la contraseña.' });
                return;
            }
            Object.assign(updateData, { contrasena: hash })
        }
        const registro = await Visitantes.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true })
            .catch(async (err) => {
                const mensajes = await validarModelo(err, true);
                if (!isEmptyObject(mensajes)) {
                    res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
                    return;
                }
                else {
                    res.status(500).send({ estado: false, mensaje: `${err.name}: ${err.message}` });
                    return;
                }
            });

        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado' });
            return;
        }
        // if (img_usuario) {
        //     await faceDetector.guardarDescriptorUsuario({ id_usu_modif: id_usuario, id_visitante: registro._id, img_usuario: registro.img_usuario });
        // }
        // else {
        //     await faceDetector.deshabilitarDescriptor({ id_usu_modif: id_usuario, id_usuario: registro._id });
        // }
        let correoEnviado = contrasena ? await enviarCorreoUsuarioNuevaContrasena(correo, contrasena) : false;
        // const { habilitarIntegracionHv } = await Configuracion.findOne({}, 'habilitarIntegracionHv') as IConfiguracion;
        // if (habilitarIntegracionHv) {
        //     const paneles = await DispositivosHv.find({ activo: true, tipo_check: { $ne: 0 }, id_acceso: { $in: [id_acceso] } });
        //     for await (let panel of paneles) {
        //         const { direccion_ip, usuario, contrasena } = panel;
        //         const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
        //         const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
        //         if (registro.img_usuario) await HVPANEL.getTokenValue();
        //         await HVPANEL.saverUser(registro);
        //     }
        // }
        res.status(200).json({
            estado: true,
            datos: {
                correoEnviado,
                verificado: requiereReverificacion ? false : Boolean(registroPrev.verificado),
                documentos_changed: docChecksChanged,
                requiereReverificacion,
            }
        });
        return;
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
};

export async function modificarEstado(req: Request, res: Response): Promise<void> {
    try {
        const { activo } = req.body;
        const validar_registro = await Visitantes.findOne({ _id: req.params.id, id_visitante: 1 });
        if (validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'No puede eliminar al usuario maestro.' });
            return;
        }
        const registro = await Visitantes.findByIdAndUpdate(req.params.id, { $set: { activo: !activo } });
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado.' });
            return;
        }
        await FaceDescriptors.updateOne({ id_visitante: req.params.id }, { $set: { activo: !activo } });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function eliminarPermanente(req: Request, res: Response): Promise<void> {
    try {
        const registro = await Visitantes.findById(req.params.id, 'activo id_visitante');
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: 'Visitante no encontrado.' });
            return;
        }
        if (registro.activo) {
            res.status(200).json({ estado: false, mensaje: 'Primero desactiva al visitante.' });
            return;
        }
        const fechaEliminacion = new Date();
        await Visitantes.findByIdAndUpdate(req.params.id, {
            $set: {
                eliminado_permanente: true,
                activo: false,
                fecha_eliminacion_permanente: fechaEliminacion,
                fecha_modificacion: fechaEliminacion
            }
        });
        res.status(200).json({ estado: true });
    } catch (error: any) {
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function revertirCreacion(req: Request, res: Response): Promise<void> {
    try {
        const id = String(req.params?.id || "");
        if (!id) {
            res.status(200).json({ estado: false, mensaje: "Falta el id del visitante." });
            return;
        }

        const registro = await Visitantes.findById(id, "_id").lean();
        if (!registro) {
            res.status(200).json({ estado: true });
            return;
        }

        await FaceDescriptors.deleteMany({ id_visitante: id });
        await Visitantes.findByIdAndDelete(id);

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function anonimizar(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const validar_registro = await Visitantes.findById(req.params.id, 'nombre correo telefono movil activo');

        if (!validar_registro) {
            res.status(200).json({ estado: false, mensaje: 'Usuario no encontrado.' });
            return;
        }
        if (validar_registro.activo) {
            res.status(200).json({ estado: false, mensaje: 'El usuario se encuentra activo.' });
            return;
        }

        const { correo } = validar_registro;
        const hash = generarCodigoUnico(10);
        const correo_arco = `${hash}@${correo.split('@')[1]}`;

        await Visitantes.findByIdAndUpdate(req.params.id, { $set: { img_usuario: '', apellido_pat: "", apellido_mat: "", correo: correo_arco, modificado_por: id_usuario, fecha_modificacion: Date.now(), arco: true } })
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function cargarProgramacionUsuarios(req: Request, res: Response): Promise<void> {
    try {
        const id_usuario = (req as UserRequest).userId;
        const { registros: datos, envioCorreos } = req.body;

        let detectoErrores = false;
        const registros = [];
        for await (const registro of datos) {
            let errorPass = false;
            const { contrasena } = registro;
            const hash = bcrypt.hashSync(contrasena, 10);
            if (!hash) {
                errorPass = true;
                return;
            }
            const nuevoUsuario = new Visitantes({ ...registro });
            const mensajes = await validarModelo(nuevoUsuario);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...registro, errores: { contrasena: errorPass ? 'Hubo un error al generar la contraseña.' : '', ...mensajes } });
                continue;
            }
            registros.push({ ...registro, contrasena_hashed: hash });
        }
        const arrDuplicados = marcarDuplicados(registros);
        detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: registros });
            return;
        }

        let correosEnviados = 0;
        let usuariosCreados = 0;
        let registrosGuardados = [];
        for await (const registro of registros) {
            let resultCorreoUsuario = false;
            const { contrasena_hashed } = registro;

            const nuevoUsuario = new Visitantes({ ...registro, contrasena: contrasena_hashed, creado_por: id_usuario });
            await nuevoUsuario.save();
            if (envioCorreos) {
                const { correo, contrasena } = registro;
                let roles = await Roles.find({ rol: { $in: [10] }, activo: true }, 'nombre');
                const rolesString = roles.map((item) => item.nombre).join(' - ');
                const nombreCompleto = [registro.nombre, registro.apellido_pat, registro.apellido_mat]
                    .filter(Boolean)
                    .join(" ");
                resultCorreoUsuario = await enviarCorreoUsuario(correo, contrasena, rolesString, nombreCompleto);
                log(`${fecha()} INFO: Carga masiva visitantes correo. correo=${String(correo || "")} enviado=${resultCorreoUsuario}\n`);
                if (resultCorreoUsuario) correosEnviados++;
            }
            usuariosCreados++;
            registrosGuardados.push({ ...registro, envioHabilitado: envioCorreos, correoEnviado: resultCorreoUsuario });
        }
        res.status(200).send({ estado: true, datos: { registros: registrosGuardados, visitantes: usuariosCreados, correos: correosEnviados } });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const KEYS = {
    'Nombre*': 'nombre',
    'Apellido Paterno*': 'apellido_pat',
    'Apellido Materno': 'apellido_mat',
    'Correo*': 'correo',
    'Contraseña*': 'contrasena',
    'Teléfono': 'telefono',
    'Empresa': 'empresa',
}
const isCellHyperlinkValue = (value: CellHyperlinkValue): value is CellHyperlinkValue => !!value?.hyperlink;
const isCellFormulaValue = (value: CellFormulaValue): value is CellFormulaValue => !!value?.formula;

interface UploadedFile {
    data: Buffer | ArrayBuffer | Uint8Array;
    name: string;
    mimetype: string;
    size: number;
}

export async function cargarFormato(req: Request, res: Response): Promise<void> {
    try {
        const workbook = new Excel.Workbook();
        if (!req.files || !req.files.document) {
            res.status(400).send({ estado: false, mensaje: 'No se ha proporcionado un archivo válido.' });
            return;
        }
        const file = req.files.document;
        const datos: any[] = [];
        const fileData = Buffer.from(Array.isArray(file) ? file[0].data : file.data) as Buffer;
        await workbook.xlsx
            .load(fileData as any)
            .then(workbook => {
                const worksheet = workbook.getWorksheet(1);
                if (worksheet) {
                    const firstRow = worksheet.getRow(1);
                    const keys = Array.isArray(firstRow.values) ? firstRow.values.map((item) => String(item)) : []
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber == 1) return;
                        const valores = Array.isArray(row.values) ? row.values.map((item) => item) : [];
                        if (valores.length < 7) return;
                        let obj: { [key: string]: string | CellValue } = {};
                        for (let i = 0; i < keys.length; i++) {
                            obj[keys[i]] = valores[i];
                        }

                        const data = Object.entries(obj).reduce((op: { [key: string]: unknown }, [key, value]: [key: string, value: CellValue]) => {
                            switch (key) {
                                case "Correo*":
                                    op["correo"] = isCellHyperlinkValue(value as CellHyperlinkValue) ? (value as CellHyperlinkValue).text : String(value).trim();
                                    break;
                                case "Empresa":
                                    op["empresa"] = isCellFormulaValue(value as CellFormulaValue) ? (value as CellFormulaValue).result : String(value).trim();
                                    break;
                                default:
                                    const opKey = KEYS[key as keyof typeof KEYS];
                                    if (typeof value === "string")
                                        op[opKey] = String(value).trim();
                                    if (typeof value === "number")
                                        op[opKey] = String(value);
                                    break;
                            }
                            return op;
                        }, {});
                        if (!data.nombre && !data.apellido_pat && !data.correo && !data.contrasena) return;
                        datos.push({ _id: new Types.ObjectId(), ...data })
                    });
                }
            })
            .catch((error) => {
                throw error;
            })

        if (datos.length === 0) {
            res.status(400).send({ estado: false, mensaje: 'El archivo está vacío.' });
            return;
        }
        let detectoErrores = false;
        // Validar registros.
        const registros = [];
        for await (let usuario of datos) {
            const nuevoUsuario = new Visitantes({ ...usuario });
            const mensajes = await validarModelo(nuevoUsuario);
            if (!isEmptyObject(mensajes)) {
                registros.push({ ...usuario, errores: mensajes });
                continue;
            }
            registros.push({ ...usuario });
        }
        const arrDuplicados = marcarDuplicados(registros);
        detectoErrores = arrDuplicados.some((item) => !!item.errores);
        if (detectoErrores) {
            res.status(200).send({ estado: false, datos: registros });
            return;
        }
        res.status(200).json({ estado: true, datos: registros });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` })
    }
};

export async function descargarFormato(req: Request, res: Response): Promise<void> {
    fs.unlink('./temp/formatoUsuarios.xlsx', function (err) {
        if (err) {
            crearExcel(req, res);
        } else {
            crearExcel(req, res);
        }
    })
};

export async function crearExcel(req: Request, res: Response): Promise<void> {
    const options = {
        root: './'
    };
    try {
        fs.access('./temp/formatoUsuarios.xlsx', async (error: any) => {
            if (error) {
                const workbook = new Excel.Workbook();
                // Hoja 1 - General 
                const worksheet = workbook.addWorksheet('General');
                const Columns = [] as Column[];
                const headersValues = [
                    'Nombre*',
                    'Apellido Paterno*',
                    'Apellido Materno',
                    'Correo*',
                    'Contraseña*',
                    'Teléfono',
                    'Empresa',
                ];
                headersValues.map(header => {
                    Columns.push({ header: header, key: header, width: 40 } as Column)
                });
                worksheet.columns = Columns;

                await worksheet.protect(CONFIG.SECRET_EXCELJS, {});
                await workbook
                    .xlsx
                    .writeFile('./temp/formatoUsuarios.xlsx')
                    .then(async () => {
                        añadir().then(async () => {
                            await res.sendFile('./temp/formatoUsuarios.xlsx', options);
                        });
                    })
                    .catch((error: any) => {
                        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
                    });

            } else {
                log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
                res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
            }
        });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

const añadir = async () => {
    const nameFileExcel = './temp/formatoUsuarios.xlsx'
    const workbook = new Excel.Workbook();
    const colorRequired = "FFC000";
    const colorNotRequired = "92D050";
    const rowLimit = 50;
    // Hoja 1 - General
    await workbook.xlsx.readFile(nameFileExcel)
        .then(() => {
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) throw new Error('Hubo un error al leer la primer hoja de Excel');

            const headers = worksheet.getRow(1);
            const STR = [
                { letter: "A", required: true },
                { letter: "B", required: true },
                { letter: "C", required: false },
                { letter: "D", required: true },
                { letter: "E", required: true },
                { letter: "F", required: false },
                { letter: "G", required: false },
            ];

            STR.forEach((item) => {
                const CLM = worksheet.getColumn(item.letter);
                CLM.protection = { locked: false };
                CLM.alignment = { vertical: 'middle', horizontal: 'center' };
                headers.getCell(item.letter).protection = { locked: true };
                headers.getCell(item.letter).fill = {
                    type: 'pattern',
                    pattern: 'darkTrellis',
                    fgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    },
                    bgColor: {
                        argb: item.required ? colorRequired : colorNotRequired
                    }
                };
            });
            for (let i = 2; i < rowLimit; i++) {
                const getRowInsert = worksheet.getRow(i)
                getRowInsert.getCell("F").dataValidation = {
                    type: 'decimal',
                    operator: 'between',
                    allowBlank: true,
                    showErrorMessage: true,
                    formulae: [0, 999999999999999],
                    errorTitle: 'Error',
                    error: 'El formato no es válido.'
                }
            }

            return workbook.xlsx.writeFile(nameFileExcel);
        });
}


export const bloquearBack = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Necesitamos id_visitante para calcular employeeNo
        const visitante = await Visitantes.findById(id, "_id bloqueado id_visitante desbloqueado_hasta").lean<any>();
        if (!visitante) {
        return res.status(404).json({ estado: false, mensaje: "Visitante no encontrado" });
        }

        const { endTime } = getRangoPasado();
        await setVisitantePanelAccess({ id_visitante: Number(visitante.id_visitante), target: "ninguno" });

        // 2) Mongo: marcar bloqueado y limpiar desbloqueo
        const updated = await Visitantes.findByIdAndUpdate(
        id,
        { 
        $set: { 
            bloqueado: true,
            // guarda la fecha real que pusiste en el panel (ayer 23:59:59)
            desbloqueado_hasta: new Date(endTime),
            acceso_qr_estado: "cerrado",
            acceso_qr_modo: "",
            acceso_qr_expira: null,
            } 
        },
        { new: true }
        )
        .select("_id bloqueado desbloqueado_hasta")
        .lean<any>();

        return res.json({
        estado: true,
        mensaje: "Visitante bloqueado (vigencia expirada en panel)",
        data: {
            _id: updated._id,
            bloqueado: true,
            desbloqueado_hasta: updated.desbloqueado_hasta ?? null,
        },
        });
    } catch (error: any) {
        console.log("[BLOQUEAR] ERROR:", error?.message || error);
        return res.status(500).json({ estado: false, mensaje: "Error al bloquear visitante" });
    }
};

export const desbloquearAccesoBack = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const id_usuario = (req as UserRequest).userId;
        const modo = String(req.body?.modo || "entrada") as PanelAccessMode;
        const motivo = String(req.body?.motivo || "").trim();

        if (!["entrada", "salida", "ambos"].includes(modo)) {
            return res.status(400).json({ estado: false, mensaje: "Modo de acceso invalido." });
        }

        const visitante = await Visitantes.findById(
            id,
            "_id bloqueado id_visitante desbloqueado_hasta intentos verificado activo"
        ).lean<any>();
        if (!visitante) {
            return res.status(404).json({ estado: false, mensaje: "Visitante no encontrado" });
        }
        if (!visitante.activo || !visitante.verificado) {
            return res.status(200).json({ estado: false, mensaje: "El visitante debe estar activo y verificado." });
        }
        if ((modo === "entrada" || modo === "ambos") && !req.body?.confirmar_entrada_manual) {
            return res.status(200).json({
                estado: false,
                requiere_ine: true,
                mensaje: "Para activar entrada usa la validacion con INE/OCR.",
            });
        }
        if (modo === "salida") {
            const ultimaEntrada = await Eventos.findOne({ id_visitante: visitante._id, tipo_check: 5 }).sort({ fecha_creacion: -1 }).lean<any>();
            const ultimaSalida = await Eventos.findOne({ id_visitante: visitante._id, tipo_check: 6 }).sort({ fecha_creacion: -1 }).lean<any>();
            if (!ultimaEntrada || (ultimaSalida && dayjs(ultimaSalida.fecha_creacion).isAfter(dayjs(ultimaEntrada.fecha_creacion)))) {
                return res.status(200).json({
                    estado: false,
                    mensaje: "No se puede activar salida sin una entrada previa pendiente de salida.",
                });
            }
        }

        const validRange = modo === "entrada" ? getTemporaryValidRange(ACCESS_MINUTES) : getTodayValidRange();
        const panelSync = await setVisitantePanelAccess({
            id_visitante: Number(visitante.id_visitante),
            target: modo,
            validRange,
        });
        const expira = dayjs(validRange.endTime).toDate();

        const updated = await Visitantes.findByIdAndUpdate(
            id,
            {
                $set: {
                    bloqueado: false,
                    intentos: 0,
                    desbloqueado_hasta: expira,
                    acceso_qr_estado: accessStateForMode(modo),
                    acceso_qr_modo: modo,
                    acceso_qr_expira: expira,
                    acceso_qr_autorizado_por: id_usuario,
                    acceso_qr_motivo: motivo,
                    fecha_modificacion: new Date(),
                    modificado_por: id_usuario,
                },
            },
            { new: true }
        )
            .select("_id bloqueado desbloqueado_hasta acceso_qr_estado acceso_qr_modo acceso_qr_expira")
            .lean<any>();

        return res.json({
            estado: true,
            mensaje: modo === "salida" ? "Salida habilitada." : "Acceso habilitado temporalmente.",
            data: {
                _id: updated._id,
                bloqueado: false,
                desbloqueado_hasta: updated.desbloqueado_hasta,
                acceso_qr_estado: updated.acceso_qr_estado,
                acceso_qr_modo: updated.acceso_qr_modo,
                acceso_qr_expira: updated.acceso_qr_expira,
                paneles: panelSync,
            },
        });
    } catch (error: any) {
        console.log("[DESBLOQUEAR_ACCESS] ERROR:", error?.message || error);
        return res.status(500).json({ estado: false, mensaje: "Error al habilitar acceso" });
    }
};

export const desbloquearBack = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const visitante = await Visitantes.findById(id, "_id bloqueado id_visitante desbloqueado_hasta intentos").lean<any>();
        if (!visitante) {
        return res.status(404).json({ estado: false, mensaje: "Visitante no encontrado" });
        }

        // 1) Hikvision: habilitar solo HOY
        const employeeNo = calcEmployeeNo(visitante.id_visitante);
        const { beginTime, endTime } = getHoyRangoLocal();

        await hvSetValidForEmployee(employeeNo, { enable: true, beginTime, endTime });

        // 2) Mongo: desbloquear hasta hoy fin del día
        

        const updated = await Visitantes.findByIdAndUpdate(
        id,
        { 
        $set: { 
            bloqueado: false,
            intentos: 0,
            // guarda exactamente el endTime que mandaste a Hikvision
            desbloqueado_hasta: new Date(endTime),
            } 
        },
        { new: true }
        )
        .select("_id bloqueado desbloqueado_hasta")
        .lean<any>();

        return res.json({
        estado: true,
        mensaje: "Visitante desbloqueado (válido solo hoy en panel)",
        data: {
            _id: updated._id,
            bloqueado: false,
            desbloqueado_hasta: updated.desbloqueado_hasta,
        },
        });
    } catch (error: any) {
        console.log("[DESBLOQUEAR] ERROR:", error?.message || error);
        return res.status(500).json({ estado: false, mensaje: "Error al desbloquear visitante" });
    }
};
