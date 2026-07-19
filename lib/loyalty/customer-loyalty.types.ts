export type CustomerRewardStatus =
  | "active"
  | "redeemed"
  | "expired"
  | "cancelled";

export type CustomerRewardSummary = {
  id: number;
  customerId: number;
  rewardType: string;
  name: string;
  description: string | null;
  status: CustomerRewardStatus;
  issuedAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  cancelledAt: string | null;
  campaignId: number | null;
  source: string;
  sourceReference: string | null;
  legacyRewardId: string | null;
  metadata: Record<string, unknown>;
};

export type CustomerLoyaltyMovementSummary = {
  id: number;
  customerId: number;
  saleId: number | null;
  rewardId: number | null;
  movementType: string;
  stampDelta: number;
  stampBalanceAfter: number | null;
  source: string;
  sourceReference: string | null;
  reason: string | null;
  actorRole: string | null;
  actorIdentifier: string | null;
  reversalOfMovementId: number | null;
  occurredAt: string;
};

export type CustomerLoyaltyAccountSummary = {
  customerId: number;
  currentStampBalance: number;
  lifetimeStampsEarned: number;
  lifetimeStampsReversed: number;
  lifetimeRewardsIssued: number;
  lifetimeRewardsRedeemed: number;
  activeRewardsCount: number;
  lastMovementId: number | null;
  lastMovementAt: string | null;
  projectionVersion: number;
};

export type CustomerLoyaltySummary = {
  customerId: number;
  account: CustomerLoyaltyAccountSummary;
  currentStampBalance: number;
  lifetimeStampsEarned: number;
  lifetimeStampsReversed: number;
  lifetimeRewardsIssued: number;
  lifetimeRewardsRedeemed: number;
  activeRewardsCount: number;
  activeRewards: CustomerRewardSummary[];
  redeemedRewards: CustomerRewardSummary[];
  expiredRewards: CustomerRewardSummary[];
  cancelledRewards: CustomerRewardSummary[];
  lastMovementAt: string | null;
};

export type GetCustomerLoyaltyOptions = {
  includeMovements?: boolean;
  movementLimit?: number;
};

export type CustomerLoyaltyDetails = CustomerLoyaltySummary & {
  movements: CustomerLoyaltyMovementSummary[];
};
