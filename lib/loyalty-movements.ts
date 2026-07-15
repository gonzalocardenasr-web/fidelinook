import { supabaseAdmin } from "./supabase-admin";

export type LoyaltyMovementType =
  | "opening_balance"
  | "sale_credit"
  | "sale_reversal"
  | "promotion_credit"
  | "manual_credit"
  | "manual_debit"
  | "reward_conversion"
  | "legacy_adjustment";

export type LoyaltyMovementMetadata = Record<string, unknown>;

export type RecordLoyaltyMovementInput = {
  customerId: number;
  movementType: LoyaltyMovementType;
  stampDelta: number;

  source: string;
  sourceReference?: string | number | null;

  saleId?: number | null;
  rewardId?: number | null;

  reason?: string | null;
  actorRole?: string | null;
  actorIdentifier?: string | null;

  reversalOfMovementId?: number | null;

  occurredAt?: string | Date | null;
  idempotencyKey?: string | null;

  metadata?: LoyaltyMovementMetadata;
};

export type RecordLoyaltyMovementResult = {
  movementId: number;
  created: boolean;
  customerId: number;
  stampDelta: number;
  stampBalanceBefore?: number | null;
  stampBalanceAfter: number;
};

function normalizePositiveId(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeOptionalPositiveId(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizePositiveId(value, fieldName);
}

function normalizeRequiredText(value: unknown, fieldName: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeOccurredAt(value?: string | Date | null) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha del movimiento no es válida.");
  }

  return date.toISOString();
}

export function buildLoyaltyMovementIdempotencyKey(
  parts: Array<string | number | null | undefined>,
) {
  const normalized = parts
    .map((part) => normalizeOptionalText(part))
    .filter((part): part is string => Boolean(part));

  if (normalized.length === 0) {
    throw new Error("No fue posible construir la clave de idempotencia.");
  }

  return normalized.join(":");
}

export async function recordLoyaltyMovement(
  input: RecordLoyaltyMovementInput,
): Promise<RecordLoyaltyMovementResult> {
  const customerId = normalizePositiveId(input.customerId, "El cliente");

  const stampDelta = Number(input.stampDelta);

  if (!Number.isInteger(stampDelta) || stampDelta === 0) {
    throw new Error(
      "La variación de sellos debe ser un número entero distinto de cero.",
    );
  }

  const source = normalizeRequiredText(input.source, "El origen");

  const { data, error } = await supabaseAdmin.rpc("record_loyalty_movement", {
    p_customer_id: customerId,
    p_movement_type: input.movementType,
    p_stamp_delta: stampDelta,
    p_source: source,
    p_source_reference: normalizeOptionalText(input.sourceReference),
    p_sale_id: normalizeOptionalPositiveId(input.saleId, "La venta"),
    p_reward_id: normalizeOptionalPositiveId(input.rewardId, "El premio"),
    p_reason: normalizeOptionalText(input.reason),
    p_actor_role: normalizeOptionalText(input.actorRole),
    p_actor_identifier: normalizeOptionalText(input.actorIdentifier),
    p_reversal_of_movement_id: normalizeOptionalPositiveId(
      input.reversalOfMovementId,
      "El movimiento reversado",
    ),
    p_occurred_at: normalizeOccurredAt(input.occurredAt),
    p_idempotency_key: normalizeOptionalText(input.idempotencyKey),
    p_metadata: input.metadata || {},
  });

  if (error) {
    throw new Error(
      `No se pudo registrar el movimiento de fidelización: ${error.message}`,
    );
  }

  const movementId = Number(data?.movement_id);
  const resultCustomerId = Number(data?.customer_id);
  const resultStampDelta = Number(data?.stamp_delta);
  const stampBalanceAfter = Number(data?.stamp_balance_after);

  const stampBalanceBefore =
    data?.stamp_balance_before === null ||
    data?.stamp_balance_before === undefined
      ? null
      : Number(data.stamp_balance_before);

  if (
    !Number.isInteger(movementId) ||
    movementId <= 0 ||
    !Number.isInteger(resultCustomerId) ||
    resultCustomerId <= 0 ||
    !Number.isInteger(resultStampDelta) ||
    !Number.isInteger(stampBalanceAfter) ||
    stampBalanceAfter < 0
  ) {
    throw new Error(
      "El motor de fidelización no entregó una respuesta válida.",
    );
  }

  return {
    movementId,
    created: Boolean(data?.created),
    customerId: resultCustomerId,
    stampDelta: resultStampDelta,
    stampBalanceBefore,
    stampBalanceAfter,
  };
}
