import { supabaseAdmin } from "../supabase-admin";

export type EmailPriority = 0 | 1 | 2 | 3;

type EnqueueEmailInput = {
  recipientEmail: string;
  emailType: string;
  priority: EmailPriority;
  idempotencyKey: string;

  payload?: Record<string, unknown>;

  customerId?: number | null;
  sourceType?: string | null;
  sourceReference?: string | null;

  maxAttempts?: number;
};

export type QueuedEmail = {
  id: number;
  customer_id: number | null;
  recipient_email: string;
  email_type: string;
  priority: number;
  payload: Record<string, unknown>;
  status: string;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
};

export async function enqueueEmail(
  input: EnqueueEmailInput,
): Promise<QueuedEmail> {
  const { data, error } = await supabaseAdmin.rpc("enqueue_email", {
    p_recipient_email: input.recipientEmail,
    p_email_type: input.emailType,
    p_priority: input.priority,
    p_idempotency_key: input.idempotencyKey,
    p_payload: input.payload ?? {},
    p_customer_id: input.customerId ?? null,
    p_source_type: input.sourceType ?? null,
    p_source_reference: input.sourceReference ?? null,
    p_max_attempts: input.maxAttempts ?? 5,
  });

  if (error) {
    throw new Error(`Could not enqueue email: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Email queue did not return a valid row");
  }

  return data as QueuedEmail;
}
