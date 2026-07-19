import "server-only";
import { supabaseAdmin } from "../supabase-admin";
import {
  CustomerRewardRow,
  LoyaltyAccountRow,
  LoyaltyMovementRow,
} from "./customer-loyalty.mapper";

export type CustomerLoyaltyRepositoryResult = {
  account: LoyaltyAccountRow | null;
  rewards: CustomerRewardRow[];
  movements: LoyaltyMovementRow[];
};

function normalizeCustomerId(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("El cliente no es válido.");
  }

  return parsed;
}

function normalizeMovementLimit(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 50;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("El límite de movimientos no es válido.");
  }

  return Math.min(parsed, 200);
}

export async function findCustomerLoyaltyData({
  customerId,
  includeMovements = false,
  movementLimit = 50,
}: {
  customerId: number;
  includeMovements?: boolean;
  movementLimit?: number;
}): Promise<CustomerLoyaltyRepositoryResult> {
  const normalizedCustomerId = normalizeCustomerId(customerId);

  const normalizedMovementLimit = normalizeMovementLimit(movementLimit);

  const accountPromise = supabaseAdmin
    .from("loyalty_accounts")
    .select(
      `
      customer_id,
      current_stamp_balance,
      lifetime_stamps_earned,
      lifetime_stamps_reversed,
      lifetime_rewards_issued,
      lifetime_rewards_redeemed,
      active_rewards_count,
      last_movement_id,
      last_movement_at,
      projection_version
    `,
    )
    .eq("customer_id", normalizedCustomerId)
    .maybeSingle();

  const rewardsPromise = supabaseAdmin
    .from("customer_rewards")
    .select(
      `
      id,
      customer_id,
      reward_type,
      name,
      description,
      status,
      issued_at,
      expires_at,
      redeemed_at,
      cancelled_at,
      campaign_id,
      legacy_reward_id,
      source,
      source_reference,
      metadata
    `,
    )
    .eq("customer_id", normalizedCustomerId)
    .order("issued_at", {
      ascending: false,
    })
    .order("id", {
      ascending: false,
    });

  const movementsPromise = includeMovements
    ? supabaseAdmin
        .from("loyalty_movements")
        .select(
          `
          id,
          customer_id,
          sale_id,
          reward_id,
          movement_type,
          stamp_delta,
          stamp_balance_after,
          source,
          source_reference,
          reason,
          actor_role,
          actor_identifier,
          reversal_of_movement_id,
          occurred_at
        `,
        )
        .eq("customer_id", normalizedCustomerId)
        .order("occurred_at", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        })
        .limit(normalizedMovementLimit)
    : Promise.resolve({
        data: [] as LoyaltyMovementRow[],
        error: null,
      });

  const [accountResult, rewardsResult, movementsResult] = await Promise.all([
    accountPromise,
    rewardsPromise,
    movementsPromise,
  ]);

  if (accountResult.error) {
    throw new Error(
      `No se pudo cargar la cuenta de fidelización: ${accountResult.error.message}`,
    );
  }

  if (rewardsResult.error) {
    throw new Error(
      `No se pudieron cargar los premios del cliente: ${rewardsResult.error.message}`,
    );
  }

  if (movementsResult.error) {
    throw new Error(
      `No se pudieron cargar los movimientos de fidelización: ${movementsResult.error.message}`,
    );
  }

  return {
    account: (accountResult.data as LoyaltyAccountRow | null) || null,

    rewards: (rewardsResult.data as CustomerRewardRow[] | null) || [],

    movements: (movementsResult.data as LoyaltyMovementRow[] | null) || [],
  };
}
