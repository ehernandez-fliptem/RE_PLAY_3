import dayjs from "dayjs";
import DispositivosHv from "../../models/DispositivosHv";
import Eventos from "../../models/Eventos";
import { fecha, log } from "../../middlewares/log";

type AggResultado = {
  _id: any;
  diffs: number[];
  ultimaMuestra?: Date;
};

const MAX_VALID_DIFF_SECONDS = 14 * 60 * 60; // 14h
const ROUND_HOUR_TOLERANCE_SECONDS = 10 * 60; // 10m
const ALERT_THRESHOLD_SECONDS = 30 * 60; // 30m

function mediana(values: number[]): number {
  const ordenados = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 === 0) return (ordenados[mid - 1] + ordenados[mid]) / 2;
  return ordenados[mid];
}

function offsetRecomendado(diffMedian: number): number {
  const roundedHour = Math.round(diffMedian / 3600) * 3600;
  if (!roundedHour) return 0;
  if (Math.abs(diffMedian - roundedHour) <= ROUND_HOUR_TOLERANCE_SECONDS) return roundedHour;
  return Math.round(diffMedian);
}

export async function recalibrarRelojPaneles(): Promise<void> {
  try {
    const desde = dayjs().subtract(24, "hour").toDate();
    const datos = await Eventos.aggregate<AggResultado>([
      {
        $match: {
          id_panel: { $ne: null },
          fecha_servidor_recepcion: { $gte: desde },
          desfase_reloj_segundos: { $exists: true },
        },
      },
      {
        $project: {
          id_panel: 1,
          desfase_reloj_segundos: 1,
          fecha_servidor_recepcion: 1,
        },
      },
      {
        $group: {
          _id: "$id_panel",
          diffs: { $push: "$desfase_reloj_segundos" },
          ultimaMuestra: { $max: "$fecha_servidor_recepcion" },
        },
      },
    ]);

    for (const item of datos) {
      const diffsValidos = (item.diffs || [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && Math.abs(n) <= MAX_VALID_DIFF_SECONDS);
      if (!diffsValidos.length) continue;

      const median = mediana(diffsValidos);
      const offset = offsetRecomendado(median);
      const alerta = Math.abs(offset) >= ALERT_THRESHOLD_SECONDS;

      await DispositivosHv.updateOne(
        { _id: item._id },
        {
          $set: {
            reloj_offset_segundos: offset,
            reloj_alerta_activa: alerta,
            reloj_ultimo_desfase_segundos: Math.round(median),
            reloj_ultima_muestra: item.ultimaMuestra || new Date(),
          },
        }
      );
    }
  } catch (error: any) {
    log(`${fecha()} ERROR-RELOJ-PANELES: ${error.name}: ${error.message}\n`);
  }
}
