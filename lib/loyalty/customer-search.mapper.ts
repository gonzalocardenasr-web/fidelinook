import { CustomerSearchResult } from "./customer-search.types";
import { CustomerLoyaltySummary } from "./customer-loyalty.types";

type CustomerRow = {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
};

export function mapCustomerSearchResult(
  customer: CustomerRow,
  loyalty: CustomerLoyaltySummary,
): CustomerSearchResult {
  const firstName = customer.nombre?.trim() || "";
  const lastName = customer.apellido?.trim() || "";

  return {
    id: customer.id,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email: customer.email,
    phone: customer.telefono,
    loyalty: {
      currentStampBalance: loyalty.currentStampBalance,
      activeRewards: loyalty.activeRewards,
      activeRewardsCount: loyalty.activeRewards.length,
    },
  };
}
