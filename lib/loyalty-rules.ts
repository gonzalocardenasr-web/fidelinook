import { supabaseAdmin } from "./supabase-admin";

export type LoyaltyRuleStatus = "draft" | "active" | "paused" | "retired";

export type LoyaltyRuleStackingMode = "exclusive" | "stackable" | "best_value";

export type LoyaltyRuleType =
  | "sale_stamp"
  | "first_purchase"
  | "promotion"
  | "campaign"
  | "manual"
  | "anniversary"
  | "referral";

export type LoyaltyRule = {
  id: number;
  code: string;
  version: number;
  name: string;
  description?: string | null;
  rule_type: LoyaltyRuleType | string;
  status: LoyaltyRuleStatus;
  priority: number;
  valid_from?: string | null;
  valid_until?: string | null;
  conditions: Record<string, unknown>;
  effect: Record<string, unknown>;
  stacking_mode: LoyaltyRuleStackingMode;
  stop_processing: boolean;
};

export type LoyaltyRuleContext = {
  eventType: string;

  customerId?: number | null;
  saleId?: number | null;

  channel?: string | null;
  total?: number | null;

  productSkus?: string[];
  productCategories?: string[];

  occurredAt?: string | Date | null;

  metadata?: Record<string, unknown>;
};

function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha de evaluación de fidelización no es válida.");
  }

  return date;
}

export async function getActiveLoyaltyRules({
  occurredAt,
}: {
  occurredAt?: string | Date | null;
} = {}): Promise<LoyaltyRule[]> {
  const evaluationDate = normalizeDate(occurredAt).toISOString();

  const { data, error } = await supabaseAdmin
    .from("loyalty_rules")
    .select(
      `
      id,
      code,
      version,
      name,
      description,
      rule_type,
      status,
      priority,
      valid_from,
      valid_until,
      conditions,
      effect,
      stacking_mode,
      stop_processing
    `,
    )
    .eq("status", "active")
    .or(`valid_from.is.null,valid_from.lte.${evaluationDate}`)
    .or(`valid_until.is.null,valid_until.gt.${evaluationDate}`)
    .order("priority", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(
      `No se pudieron cargar las reglas de fidelización: ${error.message}`,
    );
  }

  return (data || []) as LoyaltyRule[];
}

export function isRuleEligibleForContext({
  rule,
  context,
}: {
  rule: LoyaltyRule;
  context: LoyaltyRuleContext;
}) {
  const conditions = rule.conditions || {};

  const expectedEventType =
    typeof conditions.eventType === "string" ? conditions.eventType : null;

  if (expectedEventType && expectedEventType !== context.eventType) {
    return false;
  }

  if (conditions.requiresCustomer === true && !context.customerId) {
    return false;
  }

  const eligibleChannels = Array.isArray(conditions.eligibleChannels)
    ? conditions.eligibleChannels.map((value) => String(value).toLowerCase())
    : [];

  if (
    eligibleChannels.length > 0 &&
    !eligibleChannels.includes(String(context.channel || "").toLowerCase())
  ) {
    return false;
  }

  const minimumTotal = Number(conditions.minimumTotal);

  if (
    Number.isFinite(minimumTotal) &&
    minimumTotal > 0 &&
    Number(context.total || 0) < minimumTotal
  ) {
    return false;
  }

  return true;
}
