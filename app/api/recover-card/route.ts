import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { randomUUID } from "crypto";

import { dispatchQueuedEmailById } from "../../../lib/email/emailDispatcher";
import { enqueueEmail } from "../../../lib/email/emailQueue";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const correo = String(email || "")
      .trim()
      .toLowerCase();

    if (!correo) {
      return NextResponse.json(
        { error: "Debes ingresar un correo." },
        { status: 400 },
      );
    }

    const { data: cliente, error } = await supabase
      .from("clientes")
      .select(
        "id, nombre, correo, public_token, tarjeta_activa, email_verificado",
      )
      .eq("correo", correo)
      .maybeSingle();

    if (error) {
      console.error("Error buscando cliente para recuperar tarjeta:", error);
      return NextResponse.json(
        { error: "No se pudo procesar la solicitud." },
        { status: 500 },
      );
    }

    if (!cliente) {
      // Respuesta neutra para no revelar demasiado
      return NextResponse.json({
        ok: true,
        message:
          "Si existe una tarjeta asociada a este correo, te enviaremos un acceso a tu tarjeta.",
      });
    }

    if (!cliente.public_token) {
      return NextResponse.json(
        {
          error: "Este cliente no tiene una tarjeta disponible para recuperar.",
        },
        { status: 400 },
      );
    }

    if (!cliente.tarjeta_activa || !cliente.email_verificado) {
      return NextResponse.json(
        {
          error:
            "Tu tarjeta aún no está activa. Primero debes verificar el correo con el que la registraste.",
        },
        { status: 400 },
      );
    }

    const recoveryRequestId = randomUUID();

    const queuedEmail = await enqueueEmail({
      recipientEmail: cliente.correo,
      emailType: "CARD_RECOVERY",
      priority: 1,
      idempotencyKey: `card-recovery:${cliente.id}:${recoveryRequestId}`,
      payload: {
        nombre: cliente.nombre,
        publicToken: cliente.public_token,
      },
      customerId: cliente.id,
      sourceType: "card_recovery",
      sourceReference: recoveryRequestId,
      maxAttempts: 5,
    });

    const dispatchResult = await dispatchQueuedEmailById(queuedEmail.id);

    if (dispatchResult.sent !== 1) {
      return NextResponse.json({
        ok: true,
        emailQueued: true,
        code: "CARD_RECOVERY_PENDING",
        message:
          "Tu solicitud fue recibida. El correo con acceso a tu tarjeta está pendiente de envío.",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Te enviamos un correo con el acceso a tu tarjeta Fideli-NooK.",
    });
  } catch (error) {
    console.error("Error en /api/recover-card:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al recuperar la tarjeta." },
      { status: 500 },
    );
  }
}
