import type {
  AnalyticsFilters,
  AnalyticsRankingMetric,
  AnalyticsTopN,
} from "@/types/analytics";

const TOP_N_VALUES = [5, 10, 20, 50] as const;
const METRICS = ["revenue", "units"] as const;
const ALLOWED_PARAMS = new Set(["from", "to", "channel", "topN", "rankBy"]);

export type AnalyticsFilterResult =
  | { ok: true; filters: AnalyticsFilters }
  | { ok: false; message: string };

function isValidBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

/** Fecha de negocio actual, independiente de la zona horaria del servidor. */
export function todayInSantiago(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Valida filtros sin hacer consultas ni inferir canales existentes.
 * Si no se entrega período, utiliza exclusivamente el día comercial actual.
 * La API debe verificar el canal contra el catálogo vigente antes de consultar.
 */
export function parseAnalyticsFilters(
  params: URLSearchParams,
  now: Date = new Date(),
): AnalyticsFilterResult {
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return { ok: false, message: `Parámetro no reconocido: ${key}.` };
    }
    if (params.getAll(key).length !== 1) {
      return { ok: false, message: `Parámetro duplicado: ${key}.` };
    }
  }

  const today = todayInSantiago(now);
  const from = params.get("from") ?? today;
  const to = params.get("to") ?? today;
  if (!isValidBusinessDate(from) || !isValidBusinessDate(to)) {
    return { ok: false, message: "Las fechas deben existir y usar YYYY-MM-DD." };
  }
  if (from > to) {
    return { ok: false, message: "La fecha desde no puede ser posterior a hasta." };
  }

  const rawChannel = params.get("channel");
  if (rawChannel !== null && !/^[a-zA-Z0-9_-]{1,64}$/.test(rawChannel)) {
    return { ok: false, message: "El canal tiene un formato inválido." };
  }

  const rawTopN = params.get("topN") ?? "10";
  const topN = Number(rawTopN);
  if (!TOP_N_VALUES.includes(topN as AnalyticsTopN) || String(topN) !== rawTopN) {
    return { ok: false, message: "topN debe ser 5, 10, 20 o 50." };
  }

  const rankBy = params.get("rankBy") ?? "revenue";
  if (!METRICS.includes(rankBy as AnalyticsRankingMetric)) {
    return { ok: false, message: "rankBy debe ser revenue o units." };
  }

  return {
    ok: true,
    filters: {
      from,
      to,
      channel: rawChannel,
      topN: topN as AnalyticsTopN,
      rankBy: rankBy as AnalyticsRankingMetric,
    },
  };
}
