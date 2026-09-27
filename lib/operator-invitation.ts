import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { enqueueEmail } from "@/lib/email/emailQueue";
import { dispatchQueuedEmailById } from "@/lib/email/emailDispatcher";

type InvitationInput = {
  authUserId: string;
  email: string;
  displayName: string;
};

export async function sendOperatorInvitation(input: InvitationInput) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
  }

  const redirectTo = `${siteUrl.replace(/\/$/, "")}/activar-acceso`;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: input.email,
    options: {
      redirectTo,
    },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(
      error?.message || "Could not generate operator activation link",
    );
  }

  const invitationId = randomUUID();

  const queued = await enqueueEmail({
    recipientEmail: input.email,
    emailType: "OPERATOR_INVITATION",
    priority: 1,
    idempotencyKey: `operator-invitation:${input.authUserId}:${invitationId}`,
    payload: {
      displayName: input.displayName,
      activationUrl: data.properties.action_link,
    },
    sourceType: "operator_invitation",
    sourceReference: input.authUserId,
  });

  try {
    await dispatchQueuedEmailById(queued.id);
  } catch (dispatchError) {
    console.error(
      "Operator invitation queued but immediate dispatch failed:",
      dispatchError,
    );
  }

  return {
    queuedEmailId: queued.id,
  };
}
