import { randomUUID } from "crypto";

import { supabaseAdmin } from "../supabase-admin";
import { resend } from "./resend";
import { sendRegisterVerificationEmail } from "./sendRegisterVerificationEmail";
import { sendVerificationEmail } from "./sendVerificationEmail";
import { sendReactivationEmail } from "./sendReactivationEmail";
import { sendPrizeExpiringReminderEmail } from "./sendPrizeExpiringReminderEmail";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

type EmailQueueRow = {
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

type DispatchResult = {
  workerId: string;
  recoveredStale: number;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
};

export async function dispatchQueuedEmails(
  limit = 10,
): Promise<DispatchResult> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const workerId = `email-dispatch:${randomUUID()}`;

  const recoveredStale = await recoverStaleProcessingEmails();

  const { data: claimedData, error: claimError } = await supabaseAdmin.rpc(
    "claim_pending_emails_with_budget",
    {
      p_worker_id: workerId,
      p_limit: safeLimit,
    },
  );

  if (claimError) {
    throw new Error(`Could not claim pending emails: ${claimError.message}`);
  }

  const claimedEmails = (claimedData || []) as EmailQueueRow[];

  const result: DispatchResult = {
    workerId,
    recoveredStale,
    claimed: claimedEmails.length,
    sent: 0,
    retried: 0,
    failed: 0,
  };

  for (const email of claimedEmails) {
    await processClaimedEmail(email, workerId, result);
  }

  return result;
}

// ============================================================
// DESPACHO INMEDIATO DE UNA OBLIGACIÓN ESPECÍFICA
//
// Utilizado inicialmente por flujos P0 como registro.
// ============================================================

export async function dispatchQueuedEmailById(
  emailId: number,
): Promise<DispatchResult> {
  const workerId = `email-immediate:${randomUUID()}`;

  const recoveredStale = await recoverStaleProcessingEmails();

  const { data, error } = await supabaseAdmin.rpc(
    "claim_pending_email_by_id_with_budget",
    {
      p_email_id: emailId,
      p_worker_id: workerId,
    },
  );

  if (error) {
    throw new Error(`Could not claim email ${emailId}: ${error.message}`);
  }

  const result: DispatchResult = {
    workerId,
    recoveredStale,
    claimed: data?.id ? 1 : 0,
    sent: 0,
    retried: 0,
    failed: 0,
  };

  if (!data?.id) {
    return result;
  }

  await processClaimedEmail(data as EmailQueueRow, workerId, result);

  return result;
}

// ============================================================
// RECUPERACIÓN DE LOCKS
// ============================================================

async function recoverStaleProcessingEmails() {
  const { data, error } = await supabaseAdmin.rpc(
    "recover_stale_processing_emails",
    {
      p_stale_after_minutes: 15,
    },
  );

  if (error) {
    throw new Error(`Could not recover stale email locks: ${error.message}`);
  }

  return typeof data === "number" ? data : 0;
}

// ============================================================
// PROCESAMIENTO DE UN EMAIL YA RECLAMADO
// ============================================================

async function processClaimedEmail(
  email: EmailQueueRow,
  workerId: string,
  result: DispatchResult,
) {
  try {
    const providerMessageId = await sendQueuedEmail(email);

    const { error: sentError } = await supabaseAdmin.rpc("mark_email_sent", {
      p_email_id: email.id,
      p_worker_id: workerId,
      p_provider_message_id: providerMessageId,
    });

    if (sentError) {
      throw new Error(
        `Email sent by provider but queue could not be marked SENT: ${sentError.message}`,
      );
    }

    result.sent += 1;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`Email queue ${email.id} dispatch failed:`, error);

    try {
      const { data: retryData, error: retryError } = await supabaseAdmin.rpc(
        "mark_email_retry",
        {
          p_email_id: email.id,
          p_worker_id: workerId,
          p_error: errorMessage,
          p_retry_after_seconds: 300,
        },
      );

      if (retryError) {
        console.error(
          `Could not update retry state for email queue ${email.id}:`,
          retryError,
        );

        result.failed += 1;
        return;
      }

      const retryRow = retryData as EmailQueueRow | null;

      if (retryRow?.status === "FAILED") {
        result.failed += 1;
      } else {
        result.retried += 1;
      }
    } catch (retryStateError) {
      console.error(
        `Unexpected retry-state failure for email queue ${email.id}:`,
        retryStateError,
      );

      result.failed += 1;
    }
  }
}

// ============================================================
// EMAIL TYPE ROUTER
// ============================================================

async function sendQueuedEmail(email: EmailQueueRow): Promise<string | null> {
  switch (email.email_type) {
    case "DEV_TEST":
      return sendDevTestEmail(email);

    case "CARD_VERIFICATION":
      return sendQueuedCardVerification(email);

    case "REGISTER_VERIFICATION":
      return sendQueuedRegisterVerification(email);
    case "CRM_REACTIVATION":
      return sendQueuedReactivation(email);

    case "REWARD_EXPIRING":
      return sendQueuedRewardExpiring(email);

    default:
      throw new Error(`Unsupported queued email type: ${email.email_type}`);
  }
}

async function sendQueuedReactivation(
  email: EmailQueueRow,
): Promise<string | null> {
  const nombre = email.payload?.nombre;
  const sellosActuales = email.payload?.sellosActuales;
  const metaSellos = email.payload?.metaSellos;
  const publicToken = email.payload?.publicToken;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new Error("CRM_REACTIVATION payload requires nombre");
  }

  if (typeof sellosActuales !== "number" || !Number.isFinite(sellosActuales)) {
    throw new Error("CRM_REACTIVATION payload requires sellosActuales");
  }

  if (typeof metaSellos !== "number" || !Number.isFinite(metaSellos)) {
    throw new Error("CRM_REACTIVATION payload requires metaSellos");
  }

  if (typeof publicToken !== "string" || !publicToken.trim()) {
    throw new Error("CRM_REACTIVATION payload requires publicToken");
  }

  const result = await sendReactivationEmail(
    email.recipient_email,
    nombre,
    sellosActuales,
    metaSellos,
    publicToken,
  );

  return result.data?.id ?? null;
}

async function sendQueuedRewardExpiring(
  email: EmailQueueRow,
): Promise<string | null> {
  const nombre = email.payload?.nombre;
  const premioNombre = email.payload?.premioNombre;
  const vencimiento = email.payload?.vencimiento;
  const publicToken = email.payload?.publicToken;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new Error("REWARD_EXPIRING payload requires nombre");
  }

  if (typeof premioNombre !== "string" || !premioNombre.trim()) {
    throw new Error("REWARD_EXPIRING payload requires premioNombre");
  }

  if (typeof vencimiento !== "string" || !vencimiento.trim()) {
    throw new Error("REWARD_EXPIRING payload requires vencimiento");
  }

  if (typeof publicToken !== "string" || !publicToken.trim()) {
    throw new Error("REWARD_EXPIRING payload requires publicToken");
  }

  const result = await sendPrizeExpiringReminderEmail(
    email.recipient_email,
    nombre,
    premioNombre,
    vencimiento,
    publicToken,
  );

  return result.data?.id ?? null;
}

// ============================================================
// DEV TEST
// ============================================================

async function sendDevTestEmail(email: EmailQueueRow): Promise<string | null> {
  const message =
    typeof email.payload?.message === "string"
      ? email.payload.message
      : "Nook email queue dispatcher test.";

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email.recipient_email,
    subject: "[DEV] Nook Email Queue",
    html: `
      <p>Prueba controlada del nuevo motor de correos Nook.</p>
      <p>${escapeHtml(message)}</p>
      <p>Queue ID: ${email.id}</p>
    `,
    text: `
Prueba controlada del nuevo motor de correos Nook.

${message}

Queue ID: ${email.id}
    `.trim(),
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result.data?.id ?? null;
}

// ============================================================
// CARD VERIFICATION
// ============================================================

async function sendQueuedCardVerification(
  email: EmailQueueRow,
): Promise<string | null> {
  const nombre = email.payload?.nombre;
  const token = email.payload?.token;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new Error("CARD_VERIFICATION payload requires nombre");
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("CARD_VERIFICATION payload requires token");
  }

  const result = await sendVerificationEmail(
    email.recipient_email,
    nombre,
    token,
  );

  return result.data?.id ?? null;
}

// ============================================================
// REGISTER VERIFICATION
// ============================================================

async function sendQueuedRegisterVerification(
  email: EmailQueueRow,
): Promise<string | null> {
  const nombre = email.payload?.nombre;
  const token = email.payload?.token;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new Error("REGISTER_VERIFICATION payload requires nombre");
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("REGISTER_VERIFICATION payload requires token");
  }

  const result = await sendRegisterVerificationEmail(
    email.recipient_email,
    nombre,
    token,
  );

  return result.data?.id ?? null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
