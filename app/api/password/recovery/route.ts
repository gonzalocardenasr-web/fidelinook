import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { randomUUID } from "crypto";

import { dispatchQueuedEmailById } from "../../../../lib/email/emailDispatcher";
import { enqueueEmail } from "../../../../lib/email/emailQueue";

export async function POST(req: Request) {
  try {
    const { correo } = await req.json();

    const email = String(correo || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Debes ingresar un correo." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://fidelidad.nookheladeria.cl/restablecer-contrasena",
      },
    });

    if (error) {
      console.error("Error generateLink recovery:", error);

      return NextResponse.json(
        { ok: false, message: "No se pudo generar el enlace de recuperación." },
        { status: 500 },
      );
    }

    const resetUrl = data?.properties?.action_link;

    if (!resetUrl) {
      return NextResponse.json(
        { ok: false, message: "No se pudo obtener el enlace de recuperación." },
        { status: 500 },
      );
    }

    const recoveryRequestId = randomUUID();

    const queuedEmail = await enqueueEmail({
      recipientEmail: email,
      emailType: "PASSWORD_RESET",
      priority: 0,
      idempotencyKey: `password-reset:${recoveryRequestId}`,
      payload: {
        resetUrl,
      },
      sourceType: "password_recovery",
      sourceReference: recoveryRequestId,
      maxAttempts: 5,
    });

    const dispatchResult = await dispatchQueuedEmailById(queuedEmail.id);

    if (dispatchResult.sent !== 1) {
      return NextResponse.json({
        ok: true,
        emailQueued: true,
        code: "PASSWORD_RESET_PENDING",
        message:
          "La solicitud fue recibida. El correo para restablecer tu contraseña está pendiente de envío.",
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.",
    });
  } catch (error) {
    console.error("Error en /api/password/recovery:", error);

    return NextResponse.json(
      { ok: false, message: "Ocurrió un error inesperado." },
      { status: 500 },
    );
  }
}
