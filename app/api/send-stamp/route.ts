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
      sellosActuales,
      metaSellos,
      publicToken,
      customerId,
      idempotencyKey,
      sourceReference,
    } = body;

    if (
      !email ||
      !nombre ||
      sellosActuales == null ||
      !metaSellos ||
      !publicToken ||
      !idempotencyKey
    ) {
      return NextResponse.json(
        {
          error: "Faltan datos para registrar el correo de sello en la cola.",
        },
        { status: 400 },
      );
    }

    const queuedEmail = await enqueueEmail({
      recipientEmail: email,
      emailType: "STAMP_EARNED",
      priority: 1,
      idempotencyKey,
      payload: {
        nombre,
        sellosActuales: Number(sellosActuales),
        metaSellos: Number(metaSellos),
        publicToken,
      },
      customerId:
        Number.isInteger(Number(customerId)) && Number(customerId) > 0
          ? Number(customerId)
          : null,
      sourceType: "stamp_earned",
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
    console.error("Error en /api/send-stamp:", error);

    return NextResponse.json(
      {
        error: "No se pudo registrar el correo de sello.",
      },
      { status: 500 },
    );
  }
}
