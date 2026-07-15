import { supabaseAdmin } from "./supabase-admin";

export type ConvertLoyaltyStampsInput = {
  customerId: number;
  actorRole?: string | null;
  actorIdentifier?: string | null;
  reason?: string | null;
};

export type ConvertLoyaltyStampsResult = {
  customerId: number;
  balanceBefore: number;
  rewardsIssued: number;
  rewardIds: number[];
  stampsConsumed: number;
  conversionMovementId: number | null;
  balanceAfter: number;
  converted: boolean;
  reason?: string | null;
};

type ConvertLoyaltyStampsRpcResult = {
  customer_id?: unknown;
  balance_before?: unknown;
  rewards_issued?: unknown;
  reward_ids?: unknown;
  stamps_consumed?: unknown;
  conversion_movement_id?: unknown;
  balance_after?: unknown;
  converted?: unknown;
  reason?: unknown;
};

function normalizePositiveInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeNonNegativeInteger(value: unknown, fieldName: string) {
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

export async function convertLoyaltyStampsToRewards(
  input: ConvertLoyaltyStampsInput,
): Promise<ConvertLoyaltyStampsResult> {
  const customerId = normalizePositiveInteger(input.customerId, "El cliente");

  const { data, error } = await supabaseAdmin.rpc(
    "convert_loyalty_stamps_to_rewards",
    {
      p_customer_id: customerId,
      p_actor_role: normalizeOptionalText(input.actorRole),
      p_actor_identifier: normalizeOptionalText(input.actorIdentifier),
      p_reason: normalizeOptionalText(input.reason),
    },
  );

  if (error) {
    throw new Error(
      `No se pudieron convertir los sellos en premios: ${error.message}`,
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "La conversión de premios no entregó una respuesta válida.",
    );
  }

  const result = data as ConvertLoyaltyStampsRpcResult;

  const rewardIds = Array.isArray(result.reward_ids)
    ? result.reward_ids.map((value) =>
        normalizePositiveInteger(value, "Uno de los premios"),
      )
    : [];

  return {
    customerId: normalizePositiveInteger(
      result.customer_id,
      "El cliente devuelto",
    ),

    balanceBefore: normalizeNonNegativeInteger(
      result.balance_before,
      "El saldo anterior",
    ),

    rewardsIssued: normalizeNonNegativeInteger(
      result.rewards_issued,
      "Los premios emitidos",
    ),

    rewardIds,

    stampsConsumed: normalizeNonNegativeInteger(
      result.stamps_consumed,
      "Los sellos consumidos",
    ),

    conversionMovementId: normalizeOptionalPositiveInteger(
      result.conversion_movement_id,
      "El movimiento de conversión",
    ),

    balanceAfter: normalizeNonNegativeInteger(
      result.balance_after,
      "El saldo posterior",
    ),

    converted: Boolean(result.converted),
    reason: normalizeOptionalText(result.reason),
  };
}
