import "server-only";

import {
  buildCustomerLoyaltySummary,
  mapCustomerRewardRow,
  mapLoyaltyAccountRow,
  mapLoyaltyMovementRow,
} from "./customer-loyalty.mapper";

import { findCustomerLoyaltyData } from "./customer-loyalty.repository";

import {
  CustomerLoyaltyAccountSummary,
  CustomerLoyaltyDetails,
  CustomerLoyaltySummary,
  CustomerRewardSummary,
  GetCustomerLoyaltyOptions,
} from "./customer-loyalty.types";

function createEmptyLoyaltyAccount(
  customerId: number,
): CustomerLoyaltyAccountSummary {
  return {
    customerId,
    currentStampBalance: 0,
    lifetimeStampsEarned: 0,
    lifetimeStampsReversed: 0,
    lifetimeRewardsIssued: 0,
    lifetimeRewardsRedeemed: 0,
    activeRewardsCount: 0,
    lastMovementId: null,
    lastMovementAt: null,
    projectionVersion: 1,
  };
}

function normalizeCustomerId(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("El cliente no es válido.");
  }

  return parsed;
}

export async function getCustomerLoyalty(
  customerId: number,
): Promise<CustomerLoyaltySummary> {
  const normalizedCustomerId = normalizeCustomerId(customerId);

  const data = await findCustomerLoyaltyData({
    customerId: normalizedCustomerId,

    includeMovements: false,
  });

  const account = data.account
    ? mapLoyaltyAccountRow(data.account)
    : createEmptyLoyaltyAccount(normalizedCustomerId);

  const rewards = data.rewards.map(mapCustomerRewardRow);

  return buildCustomerLoyaltySummary({
    account,
    rewards,
  });
}

export async function getCustomerLoyaltyDetails(
  customerId: number,
  options: GetCustomerLoyaltyOptions = {},
): Promise<CustomerLoyaltyDetails> {
  const normalizedCustomerId = normalizeCustomerId(customerId);

  const data = await findCustomerLoyaltyData({
    customerId: normalizedCustomerId,

    includeMovements: options.includeMovements !== false,

    movementLimit: options.movementLimit || 50,
  });

  const account = data.account
    ? mapLoyaltyAccountRow(data.account)
    : createEmptyLoyaltyAccount(normalizedCustomerId);

  const rewards = data.rewards.map(mapCustomerRewardRow);

  const summary = buildCustomerLoyaltySummary({
    account,
    rewards,
  });

  return {
    ...summary,

    movements: data.movements.map(mapLoyaltyMovementRow),
  };
}

export async function getCustomerStampBalance(
  customerId: number,
): Promise<number> {
  const loyalty = await getCustomerLoyalty(customerId);

  return loyalty.currentStampBalance;
}

export async function getCustomerRewards(
  customerId: number,
): Promise<CustomerRewardSummary[]> {
  const loyalty = await getCustomerLoyalty(customerId);

  return [
    ...loyalty.activeRewards,
    ...loyalty.redeemedRewards,
    ...loyalty.expiredRewards,
    ...loyalty.cancelledRewards,
  ];
}

export async function getCustomerActiveRewards(
  customerId: number,
): Promise<CustomerRewardSummary[]> {
  const loyalty = await getCustomerLoyalty(customerId);

  return loyalty.activeRewards;
}
