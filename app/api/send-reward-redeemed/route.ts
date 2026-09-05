import { NextResponse } from "next/server";

import { enqueueEmail } from "../../../lib/email/emailQueue";
import { dispatchQueuedEmailById } from "../../../lib/email/emailDispatcher";
import { getOperationSession } from "../../../lib/operation-auth";

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      email,
      nombre,
      premioNombre,
      publicToken,
      customerId,
      idempotencyKey,
      sourceReference,
    } = body;

    if (!email || !nombre || !premioNombre || !publicToken || !idempotencyKey) {
      return NextResponse.json(
        {
          error: "Faltan datos para registrar el correo de canje en la cola.",
        },
        { status: 400 },
      );
    }

    const queuedEmail = await enqueueEmail({
      recipientEmail: email,
      emailType: "REWARD_REDEEMED",
      priority: 1,
      idempotencyKey,
      payload: {
        nombre,
        premioNombre,
        publicToken,
      },
      customerId:
        Number.isInteger(Number(customerId)) && Number(customerId) > 0
          ? Number(customerId)
          : null,
      sourceType: "reward_redeemed",
      sourceReference: sourceReference != null ? String(sourceReference) : null,
      maxAttempts: 5,
    });

    const dispatchResult = await dispatchQueuedEmailById(queuedEmail.id);

    return NextResponse.json({
      ok: true,
      emailQueued: true,
      emailSent: dispatchResult.sent > 0,
      queueId: queuedEmail.id,
    });
  } catch (error) {
    console.error("Error en /api/send-reward-redeemed:", error);

    return NextResponse.json(
      {
        error: "No se pudo registrar el correo de canje.",
      },
      { status: 500 },
    );
  }
}
