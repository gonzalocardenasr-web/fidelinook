import { supabaseAdmin } from "./supabase-admin";

export type CustomerEventType =
  | "customer.registered"
  | "customer.activated"
  | "sale.created"
  | "sale.customer_assigned"
  | "sale.customer_changed"
  | "sale.delivered"
  | "subscription.consumed"
  | "loyalty.opening_balance"
  | "loyalty.stamps_credited"
  | "loyalty.stamps_reversed"
  | "loyalty.reward_issued"
  | "loyalty.reward_redeemed"
  | "loyalty.reward_expired"
  | "loyalty.adjusted"
  | "campaign.reward_assigned";

export type CustomerEventMetadata = Record<
  string,
  string | number | boolean | null | unknown[] | Record<string, unknown>
>;

export type RecordCustomerEventInput = {
  customerId?: number | null;
  eventType: CustomerEventType;

  sourceModule: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | number | null;

  saleId?: number | null;
  rewardId?: number | null;
  loyaltyMovementId?: number | null;

  actorRole?: string | null;
  actorIdentifier?: string | null;

  occurredAt?: string | Date | null;
  idempotencyKey?: string | null;

  metadata?: CustomerEventMetadata;
};

export type RecordCustomerEventResult = {
  eventId: number;
  created: boolean;
};

function normalizeRequiredText(value: string, fieldName: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return normalized;
}

function normalizeOptionalText(value?: string | number | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizePositiveId(
  value: number | null | undefined,
  fieldName: string,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return normalized;
}

function normalizeOccurredAt(value?: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha del evento no es válida.");
  }

  return date.toISOString();
}

export function buildCustomerEventIdempotencyKey(
  parts: Array<string | number | null | undefined>,
) {
  const normalizedParts = parts
    .map((part) => normalizeOptionalText(part))
    .filter((part): part is string => Boolean(part));

  if (normalizedParts.length === 0) {
    throw new Error("No fue posible construir la clave de idempotencia.");
  }

  return normalizedParts.join(":");
}

export async function recordCustomerEvent(
  input: RecordCustomerEventInput,
): Promise<RecordCustomerEventResult> {
  const customerId = normalizePositiveId(input.customerId, "El cliente");

  const saleId = normalizePositiveId(input.saleId, "La venta");

  const rewardId = normalizePositiveId(input.rewardId, "El premio");

  const loyaltyMovementId = normalizePositiveId(
    input.loyaltyMovementId,
    "El movimiento de fidelización",
  );

  const sourceModule = normalizeRequiredText(
    input.sourceModule,
    "El módulo de origen",
  );

  const idempotencyKey = normalizeOptionalText(input.idempotencyKey);

  const { data, error } = await supabaseAdmin.rpc("record_customer_event", {
    p_customer_id: customerId,
    p_event_type: input.eventType,
    p_source_module: sourceModule,
    p_source_entity_type: normalizeOptionalText(input.sourceEntityType),
    p_source_entity_id: normalizeOptionalText(input.sourceEntityId),
    p_sale_id: saleId,
    p_reward_id: rewardId,
    p_loyalty_movement_id: loyaltyMovementId,
    p_actor_role: normalizeOptionalText(input.actorRole),
    p_actor_identifier: normalizeOptionalText(input.actorIdentifier),
    p_occurred_at: normalizeOccurredAt(input.occurredAt),
    p_idempotency_key: idempotencyKey,
    p_metadata: input.metadata || {},
  });

  if (error) {
    throw new Error(
      `No se pudo registrar el evento ${input.eventType}: ${error.message}`,
    );
  }

  const eventId = Number(data?.event_id);
  const created = Boolean(data?.created);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new Error(
      `El evento ${input.eventType} no entregó un identificador válido.`,
    );
  }

  return {
    eventId,
    created,
  };
}
