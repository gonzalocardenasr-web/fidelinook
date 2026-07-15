import { supabaseAdmin } from "./supabase-admin";

export type DailyLoyaltyProjectionStatus =
  | "pending"
  | "calculated"
  | "applied"
  | "reconciled"
  | "error";

export type RebuildDailyLoyaltyInput = {
  customerId: number;
  businessDate: string | Date;

  policyCode?: string;
  policyVersion?: number;

  recalculationReason?: string | null;
};

export type RebuildDailyLoyaltyResult = {
  dailyLoyaltyId: number;
  customerId: number;
  businessDate: string;
  timezone: string;

  policyCode: string;
  policyVersion: number;

  customerValidated: boolean;

  eligibleSalesCount: number;
  ineligibleSalesCount: number;
  eligibleNetAmount: number;

  baseStamps: number;
  amountStamps: number;
  firstPurchaseBonus: number;
  promotionBonus: number;

  expectedStamps: number;
  appliedStamps: number;
  pendingStampDelta: number;

  rewardsExpected: number;
  rewardsIssued: number;

  projectionStatus: DailyLoyaltyProjectionStatus;
  movementSourceReference: string;
};

type RebuildDailyLoyaltyRpcResult = {
  daily_loyalty_id?: unknown;
  customer_id?: unknown;
  business_date?: unknown;
  timezone?: unknown;

  policy_code?: unknown;
  policy_version?: unknown;

  customer_validated?: unknown;

  eligible_sales_count?: unknown;
  ineligible_sales_count?: unknown;
  eligible_net_amount?: unknown;

  base_stamps?: unknown;
  amount_stamps?: unknown;
  first_purchase_bonus?: unknown;
  promotion_bonus?: unknown;

  expected_stamps?: unknown;
  applied_stamps?: unknown;
  pending_stamp_delta?: unknown;

  rewards_expected?: unknown;
  rewards_issued?: unknown;

  projection_status?: unknown;
  movement_source_reference?: unknown;
};

function normalizePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeBusinessDate(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("La fecha comercial no es válida.");
    }

    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("La fecha comercial debe usar el formato YYYY-MM-DD.");
  }

  const date = new Date(`${normalized}T12:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error("La fecha comercial no es válida.");
  }

  return normalized;
}

function normalizeProjectionStatus(
  value: unknown,
): DailyLoyaltyProjectionStatus {
  const normalized = String(value || "").trim();

  const allowedStatuses: DailyLoyaltyProjectionStatus[] = [
    "pending",
    "calculated",
    "applied",
    "reconciled",
    "error",
  ];

  if (!allowedStatuses.includes(normalized as DailyLoyaltyProjectionStatus)) {
    throw new Error("El estado de la proyección diaria no es válido.");
  }

  return normalized as DailyLoyaltyProjectionStatus;
}

export function getBusinessDateInTimezone({
  value,
  timezone = "America/Santiago",
}: {
  value: string | Date;
  timezone?: string;
}) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "La fecha utilizada para determinar el día comercial no es válida.",
    );
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("No fue posible determinar la fecha comercial.");
  }

  return `${year}-${month}-${day}`;
}

export async function rebuildDailyLoyaltyProjection(
  input: RebuildDailyLoyaltyInput,
): Promise<RebuildDailyLoyaltyResult> {
  const customerId = normalizePositiveInteger(input.customerId, "El cliente");

  const businessDate = normalizeBusinessDate(input.businessDate);

  const policyCode = normalizeRequiredText(
    input.policyCode || "LOYALTY_POLICY_V1",
    "El código de política",
  );

  const policyVersion = normalizePositiveInteger(
    input.policyVersion || 1,
    "La versión de política",
  );

  const { data, error } = await supabaseAdmin.rpc(
    "rebuild_customer_daily_loyalty",
    {
      p_customer_id: customerId,
      p_business_date: businessDate,
      p_policy_code: policyCode,
      p_policy_version: policyVersion,
      p_recalculation_reason: normalizeOptionalText(input.recalculationReason),
    },
  );

  if (error) {
    throw new Error(
      `No se pudo reconstruir la proyección diaria: ${error.message}`,
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "La reconstrucción diaria no entregó una respuesta válida.",
    );
  }

  const result = data as RebuildDailyLoyaltyRpcResult;

  const dailyLoyaltyId = normalizePositiveInteger(
    result.daily_loyalty_id,
    "La proyección diaria",
  );

  const resultCustomerId = normalizePositiveInteger(
    result.customer_id,
    "El cliente de la proyección",
  );

  const resultBusinessDate = normalizeBusinessDate(
    String(result.business_date || ""),
  );

  const timezone = normalizeRequiredText(result.timezone, "La zona horaria");

  const resultPolicyCode = normalizeRequiredText(
    result.policy_code,
    "El código de política devuelto",
  );

  const resultPolicyVersion = normalizePositiveInteger(
    result.policy_version,
    "La versión de política devuelta",
  );

  const eligibleSalesCount = normalizeNonNegativeInteger(
    result.eligible_sales_count,
    "Las ventas elegibles",
  );

  const ineligibleSalesCount = normalizeNonNegativeInteger(
    result.ineligible_sales_count,
    "Las ventas no elegibles",
  );

  const eligibleNetAmount = normalizeNonNegativeInteger(
    result.eligible_net_amount,
    "El monto elegible",
  );

  const baseStamps = normalizeNonNegativeInteger(
    result.base_stamps,
    "Los sellos base",
  );

  const amountStamps = normalizeNonNegativeInteger(
    result.amount_stamps,
    "Los sellos por monto",
  );

  const firstPurchaseBonus = normalizeNonNegativeInteger(
    result.first_purchase_bonus,
    "El bono de primera compra",
  );

  const promotionBonus = normalizeNonNegativeInteger(
    result.promotion_bonus,
    "El bono promocional",
  );

  const expectedStamps = normalizeNonNegativeInteger(
    result.expected_stamps,
    "Los sellos esperados",
  );

  const appliedStamps = normalizeInteger(
    result.applied_stamps,
    "Los sellos aplicados",
  );

  const pendingStampDelta = normalizeInteger(
    result.pending_stamp_delta,
    "La diferencia pendiente",
  );

  const rewardsExpected = normalizeNonNegativeInteger(
    result.rewards_expected,
    "Los premios esperados",
  );

  const rewardsIssued = normalizeNonNegativeInteger(
    result.rewards_issued,
    "Los premios emitidos",
  );

  const projectionStatus = normalizeProjectionStatus(result.projection_status);

  const movementSourceReference = normalizeRequiredText(
    result.movement_source_reference,
    "La referencia del movimiento",
  );

  return {
    dailyLoyaltyId,
    customerId: resultCustomerId,
    businessDate: resultBusinessDate,
    timezone,

    policyCode: resultPolicyCode,
    policyVersion: resultPolicyVersion,

    customerValidated: Boolean(result.customer_validated),

    eligibleSalesCount,
    ineligibleSalesCount,
    eligibleNetAmount,

    baseStamps,
    amountStamps,
    firstPurchaseBonus,
    promotionBonus,

    expectedStamps,
    appliedStamps,
    pendingStampDelta,

    rewardsExpected,
    rewardsIssued,

    projectionStatus,
    movementSourceReference,
  };
}
