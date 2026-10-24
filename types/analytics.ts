/** Contratos públicos de Analytics Comercial. Sin dependencias de Supabase. */
export type AnalyticsBusinessDate = string; // YYYY-MM-DD, America/Santiago
export type AnalyticsChannel = string | null; // null = todos los canales
export type AnalyticsRankingMetric = "revenue" | "units";
export type AnalyticsTopN = 5 | 10 | 20 | 50;

export interface AnalyticsFilters {
  from: AnalyticsBusinessDate;
  to: AnalyticsBusinessDate;
  channel: AnalyticsChannel;
  topN: AnalyticsTopN;
  rankBy: AnalyticsRankingMetric;
}

export interface AnalyticsPeriod {
  from: AnalyticsBusinessDate;
  to: AnalyticsBusinessDate;
}

export interface AnalyticsCommercialSummary {
  period: AnalyticsPeriod;
  channel: AnalyticsChannel;
  salesCount: number;
  revenue: number;
  averageTicket: number;
  identifiedSalesCount: number;
  identifiedCustomersCount: number;
}

export interface AnalyticsProductRankingRow {
  productId: string | number | null;
  sku: string | null;
  name: string;
  itemGroup: "catalog_product" | "custom_line";
  units: number;
  allocatedRevenue: number;
}

export interface AnalyticsProductRanking {
  period: AnalyticsPeriod;
  channel: AnalyticsChannel;
  rankBy: AnalyticsRankingMetric;
  topN: AnalyticsTopN;
  products: AnalyticsProductRankingRow[];
  /** Debe informarse por separado: las líneas custom_line también pueden ser productos reales. */
  customLines: {
    units: number;
    allocatedRevenue: number;
  };
}

export interface AnalyticsFlavorRankingRow {
  flavorId: string | number | null;
  flavorName: string;
  observedUnits: number;
}

export interface AnalyticsFlavorCoverage {
  eligibleItemRows: number;
  observedItemRows: number;
  unknownItemRows: number;
  /** null cuando no existe denominador. */
  observedRowRate: number | null;
}

export interface AnalyticsFlavorRanking {
  period: AnalyticsPeriod;
  channel: AnalyticsChannel;
  topN: AnalyticsTopN;
  flavors: AnalyticsFlavorRankingRow[];
  coverage: AnalyticsFlavorCoverage;
  methodology: "observed_sale_item_options";
}

export type AnalyticsApiSuccess<T> = { ok: true; data: T };
export type AnalyticsApiFailure = {
  ok: false;
  code: "INVALID_FILTERS" | "UNAUTHENTICATED" | "FORBIDDEN" | "DATA_ERROR";
  message: string;
};
export type AnalyticsApiResponse<T> = AnalyticsApiSuccess<T> | AnalyticsApiFailure;
