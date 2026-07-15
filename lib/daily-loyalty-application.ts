import { supabaseAdmin } from "./supabase-admin";

export type ApplyDailyLoyaltyCreditInput = {
  dailyLoyaltyId: number;
  actorRole?: string | null;
  actorIdentifier?: string | null;
  reason?: string | null;
};

export type ApplyDailyLoyaltyCreditResult = {
  dailyLoyaltyId: number;
  customerId: number;
  businessDate: string;

  expectedStamps: number;
  previouslyAppliedStamps: number;
  appliedDelta: number;

  movementId: number | null;
  movementCreated: boolean;

  eventId: number | null;
  eventCreated: boolean;

  applied: boolean;
  reason?: string | null;
};

type ApplyDailyLoyaltyCreditRpcResult = {
  daily_loyalty_id?: unknown;
  customer_id?: unknown;
  business_date?: unknown;

  expected_stamps?: unknown;
  previously_applied_stamps?: unknown;
  applied_stamps?: unknown;
  pending_stamp_delta?: unknown;
  applied_delta?: unknown;

  movement_id?: unknown;
  movement_created?: unknown;

  event_id?: unknown;
  event_created?: unknown;

  applied?: unknown;
  reason?: unknown;
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

function normalizeOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizePositiveInteger(value, fieldName);
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeBusinessDate(value: unknown) {
  const normalized = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("La fecha comercial devuelta no es válida.");
  }

  return normalized;
}

export async function applyDailyLoyaltyCredit(
  input: ApplyDailyLoyaltyCreditInput,
): Promise<ApplyDailyLoyaltyCreditResult> {
  const dailyLoyaltyId = normalizePositiveInteger(
    input.dailyLoyaltyId,
    "La proyección diaria",
  );

  const { data, error } = await supabaseAdmin.rpc(
    "apply_customer_daily_loyalty_credit",
    {
      p_daily_loyalty_id: dailyLoyaltyId,
      p_actor_role: normalizeOptionalText(input.actorRole),
      p_actor_identifier: normalizeOptionalText(input.actorIdentifier),
      p_reason: normalizeOptionalText(input.reason),
    },
  );

  if (error) {
    throw new Error(
      `No se pudo materializar la fidelización diaria: ${error.message}`,
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error("La aplicación diaria no entregó una respuesta válida.");
  }

  const result = data as ApplyDailyLoyaltyCreditRpcResult;

  const resultDailyLoyaltyId = normalizePositiveInteger(
    result.daily_loyalty_id,
    "La proyección diaria devuelta",
  );

  const customerId = normalizePositiveInteger(
    result.customer_id,
    "El cliente devuelto",
  );

  const businessDate = normalizeBusinessDate(result.business_date);

  const expectedStamps = normalizeNonNegativeInteger(
    result.expected_stamps,
    "Los sellos esperados",
  );

  const previouslyAppliedStamps = normalizeNonNegativeInteger(
    result.previously_applied_stamps ?? result.applied_stamps ?? 0,
    "Los sellos aplicados previamente",
  );

  const appliedDelta = Number(
    result.applied_delta ?? result.pending_stamp_delta ?? 0,
  );

  if (!Number.isInteger(appliedDelta)) {
    throw new Error("La diferencia aplicada no es válida.");
  }

  const movementId = normalizeOptionalPositiveInteger(
    result.movement_id,
    "El movimiento de fidelización",
  );

  const eventId = normalizeOptionalPositiveInteger(
    result.event_id,
    "El evento de fidelización",
  );

  return {
    dailyLoyaltyId: resultDailyLoyaltyId,
    customerId,
    businessDate,

    expectedStamps,
    previouslyAppliedStamps,
    appliedDelta,

    movementId,
    movementCreated: Boolean(result.movement_created),

    eventId,
    eventCreated: Boolean(result.event_created),

    applied: Boolean(result.applied),
    reason: normalizeOptionalText(result.reason),
  };
}
