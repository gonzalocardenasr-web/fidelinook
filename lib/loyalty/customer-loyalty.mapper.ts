import {
  CustomerLoyaltyAccountSummary,
  CustomerLoyaltyMovementSummary,
  CustomerLoyaltySummary,
  CustomerRewardStatus,
  CustomerRewardSummary,
} from "./customer-loyalty.types";

export type LoyaltyAccountRow = {
  customer_id: unknown;
  current_stamp_balance: unknown;
  lifetime_stamps_earned: unknown;
  lifetime_stamps_reversed: unknown;
  lifetime_rewards_issued: unknown;
  lifetime_rewards_redeemed: unknown;
  active_rewards_count: unknown;
  last_movement_id: unknown;
  last_movement_at: unknown;
  projection_version: unknown;
};

export type CustomerRewardRow = {
  id: unknown;
  customer_id: unknown;
  reward_type: unknown;
  name: unknown;
  description: unknown;
  status: unknown;
  issued_at: unknown;
  expires_at: unknown;
  redeemed_at: unknown;
  cancelled_at: unknown;
  campaign_id: unknown;
  legacy_reward_id: unknown;
  source: unknown;
  source_reference: unknown;
  metadata: unknown;
};

export type LoyaltyMovementRow = {
  id: unknown;
  customer_id: unknown;
  sale_id: unknown;
  reward_id: unknown;
  movement_type: unknown;
  stamp_delta: unknown;
  stamp_balance_after: unknown;
  source: unknown;
  source_reference: unknown;
  reason: unknown;
  actor_role: unknown;
  actor_identifier: unknown;
  reversal_of_movement_id: unknown;
  occurred_at: unknown;
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

function normalizeOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizePositiveInteger(value, fieldName);
}

function normalizeOptionalNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeNonNegativeInteger(value, fieldName);
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = String(value ?? "").trim();

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

function normalizeRequiredDate(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalDate(value, fieldName);

  if (!normalized) {
    throw new Error(`${fieldName} es obligatoria.`);
  }

  return normalized;
}

function normalizeOptionalDate(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} no es válida.`);
  }

  return date.toISOString();
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeRewardStatus(value: unknown): CustomerRewardStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "active" ||
    normalized === "redeemed" ||
    normalized === "expired" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  throw new Error(
    `El estado de premio "${normalized || "vacío"}" no es válido.`,
  );
}

export function mapLoyaltyAccountRow(
  row: LoyaltyAccountRow,
): CustomerLoyaltyAccountSummary {
  return {
    customerId: normalizePositiveInteger(
      row.customer_id,
      "El cliente de la cuenta",
    ),

    currentStampBalance: normalizeNonNegativeInteger(
      row.current_stamp_balance,
      "El saldo actual de sellos",
    ),

    lifetimeStampsEarned: normalizeNonNegativeInteger(
      row.lifetime_stamps_earned,
      "El total histórico de sellos obtenidos",
    ),

    lifetimeStampsReversed: normalizeNonNegativeInteger(
      row.lifetime_stamps_reversed,
      "El total histórico de sellos reversados",
    ),

    lifetimeRewardsIssued: normalizeNonNegativeInteger(
      row.lifetime_rewards_issued,
      "El total histórico de premios emitidos",
    ),

    lifetimeRewardsRedeemed: normalizeNonNegativeInteger(
      row.lifetime_rewards_redeemed,
      "El total histórico de premios canjeados",
    ),

    activeRewardsCount: normalizeNonNegativeInteger(
      row.active_rewards_count,
      "La cantidad de premios activos",
    ),

    lastMovementId: normalizeOptionalPositiveInteger(
      row.last_movement_id,
      "El último movimiento",
    ),

    lastMovementAt: normalizeOptionalDate(
      row.last_movement_at,
      "La fecha del último movimiento",
    ),

    projectionVersion: normalizePositiveInteger(
      row.projection_version,
      "La versión de proyección",
    ),
  };
}

export function mapCustomerRewardRow(
  row: CustomerRewardRow,
): CustomerRewardSummary {
  return {
    id: normalizePositiveInteger(row.id, "El premio"),

    customerId: normalizePositiveInteger(
      row.customer_id,
      "El cliente del premio",
    ),

    rewardType: normalizeOptionalText(row.reward_type) || "loyalty",
    name: normalizeRequiredText(row.name, "El nombre del premio"),
    description: normalizeOptionalText(row.description),
    status: normalizeRewardStatus(row.status),
    issuedAt: normalizeRequiredDate(
      row.issued_at,
      "La fecha de emisión del premio",
    ),

    expiresAt: normalizeOptionalDate(
      row.expires_at,
      "La fecha de vencimiento del premio",
    ),

    redeemedAt: normalizeOptionalDate(
      row.redeemed_at,
      "La fecha de canje del premio",
    ),

    cancelledAt: normalizeOptionalDate(
      row.cancelled_at,
      "La fecha de cancelación del premio",
    ),

    campaignId: normalizeOptionalPositiveInteger(
      row.campaign_id,
      "La campaña del premio",
    ),

    source: normalizeRequiredText(row.source, "El origen del premio"),
    sourceReference: normalizeOptionalText(row.source_reference),
    legacyRewardId: normalizeOptionalText(row.legacy_reward_id),
    metadata: normalizeMetadata(row.metadata),
  };
}

export function mapLoyaltyMovementRow(
  row: LoyaltyMovementRow,
): CustomerLoyaltyMovementSummary {
  return {
    id: normalizePositiveInteger(row.id, "El movimiento"),

    customerId: normalizePositiveInteger(
      row.customer_id,
      "El cliente del movimiento",
    ),

    saleId: normalizeOptionalPositiveInteger(
      row.sale_id,
      "La venta del movimiento",
    ),

    rewardId: normalizeOptionalPositiveInteger(
      row.reward_id,
      "El premio del movimiento",
    ),

    movementType: normalizeRequiredText(
      row.movement_type,
      "El tipo de movimiento",
    ),

    stampDelta: normalizeInteger(row.stamp_delta, "La variación de sellos"),

    stampBalanceAfter: normalizeOptionalNonNegativeInteger(
      row.stamp_balance_after,
      "El saldo posterior",
    ),

    source: normalizeRequiredText(row.source, "El origen del movimiento"),
    sourceReference: normalizeOptionalText(row.source_reference),
    reason: normalizeOptionalText(row.reason),
    actorRole: normalizeOptionalText(row.actor_role),
    actorIdentifier: normalizeOptionalText(row.actor_identifier),
    reversalOfMovementId: normalizeOptionalPositiveInteger(
      row.reversal_of_movement_id,
      "El movimiento reversado",
    ),

    occurredAt: normalizeRequiredDate(
      row.occurred_at,
      "La fecha del movimiento",
    ),
  };
}

export function buildCustomerLoyaltySummary({
  account,
  rewards,
}: {
  account: CustomerLoyaltyAccountSummary;
  rewards: CustomerRewardSummary[];
}): CustomerLoyaltySummary {
  const activeRewards = rewards.filter((reward) => reward.status === "active");

  const redeemedRewards = rewards.filter(
    (reward) => reward.status === "redeemed",
  );

  const expiredRewards = rewards.filter(
    (reward) => reward.status === "expired",
  );

  const cancelledRewards = rewards.filter(
    (reward) => reward.status === "cancelled",
  );

  return {
    customerId: account.customerId,
    account,
    currentStampBalance: account.currentStampBalance,
    lifetimeStampsEarned: account.lifetimeStampsEarned,
    lifetimeStampsReversed: account.lifetimeStampsReversed,
    lifetimeRewardsIssued: account.lifetimeRewardsIssued,
    lifetimeRewardsRedeemed: account.lifetimeRewardsRedeemed,
    activeRewardsCount: activeRewards.length,
    activeRewards,
    redeemedRewards,
    expiredRewards,
    cancelledRewards,
    lastMovementAt: account.lastMovementAt,
  };
}
