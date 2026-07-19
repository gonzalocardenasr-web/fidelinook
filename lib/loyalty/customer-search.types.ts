import { CustomerRewardSummary } from "./customer-loyalty.types";

export type CustomerSearchResult = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;

  loyalty: {
    currentStampBalance: number;
    activeRewards: CustomerRewardSummary[];
    activeRewardsCount: number;
  };
};
