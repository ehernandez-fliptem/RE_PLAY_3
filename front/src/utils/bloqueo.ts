import dayjs from "dayjs";

function normalizeHasta(hastaRaw: any): any {
  if (!hastaRaw) return null;

  // Caso 1: ya viene string o Date
  if (typeof hastaRaw === "string" || hastaRaw instanceof Date) return hastaRaw;

  // Caso 2: viene como Extended JSON { $date: "..." }
  if (typeof hastaRaw === "object" && typeof hastaRaw.$date === "string") {
    return hastaRaw.$date;
  }

  return null;
}

export function isUnblockedNow(row: any): boolean {
  if (row?.bloqueado === true) return false;

  const hastaRaw = normalizeHasta(row?.desbloqueado_hasta);
  if (!hastaRaw) return false;

  const hasta = dayjs(hastaRaw);
  if (!hasta.isValid()) return false;

  const now = dayjs();
  return now.isBefore(hasta) || now.isSame(hasta, "second");
}

export function isBlockedNow(row: any): boolean {
  // si viene explícito bloqueado=true, es rojo sí o sí
  if (row?.bloqueado === true) return true;

  // si viene bloqueado=false, decidimos por fecha (si hay)
  return !isUnblockedNow(row);
}
