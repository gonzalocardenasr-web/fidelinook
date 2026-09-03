import { NextResponse } from "next/server";

import { dispatchQueuedEmailById } from "../../../lib/email/emailDispatcher";
import { enqueueEmail } from "../../../lib/email/emailQueue";
import { supabase } from "../../../lib/supabase";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
    }

    const { data: cliente, error: errorBusqueda } = await supabase
      .from("clientes")
      .select(
        "id, nombre, correo, email_verificado, tarjeta_activa, token_verificacion, token_verificacion_creado_en",
      )
      .eq("correo", email)
      .single();

    if (errorBusqueda || !cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 },
      );
    }

    if (cliente.email_verificado && cliente.tarjeta_activa) {
      return NextResponse.json(
        { error: "Este correo ya fue verificado" },
        { status: 400 },
      );
    }

    const tokenAnterior = cliente.token_verificacion;
    const tokenCreadoAnterior = cliente.token_verificacion_creado_en;

    const nuevoToken = generateVerificationToken();
    const nuevoTokenCreadoEn = new Date().toISOString();

    const { error: errorUpdate } = await supabase
      .from("clientes")
      .update({
        token_verificacion: nuevoToken,
        token_verificacion_creado_en: nuevoTokenCreadoEn,
      })
      .eq("id", cliente.id);

    if (errorUpdate) {
      console.error("Error actualizando token:", errorUpdate);

      return NextResponse.json(
        { error: "No se pudo generar un nuevo token" },
        { status: 500 },
      );
    }

    let queuedEmail;

    try {
      queuedEmail = await enqueueEmail({
        recipientEmail: cliente.correo,
        emailType: "CARD_VERIFICATION",
        priority: 0,
        idempotencyKey: `card-verification:${cliente.id}:${nuevoToken}`,
        payload: {
          nombre: cliente.nombre,
          token: nuevoToken,
        },
        customerId: cliente.id,
        sourceType: "card_verification_resend",
        sourceReference: String(cliente.id),
        maxAttempts: 5,
      });
    } catch (queueError) {
      console.error("Error encolando reenvío de verificación:", queueError);

      const { error: rollbackError } = await supabase
        .from("clientes")
        .update({
          token_verificacion: tokenAnterior,
          token_verificacion_creado_en: tokenCreadoAnterior,
        })
        .eq("id", cliente.id);

      if (rollbackError) {
        console.error(
          "CRITICAL: no se pudo restaurar token tras fallo de cola:",
          rollbackError,
        );
      }

      return NextResponse.json(
        {
          error:
            "No se pudo preparar el nuevo correo de verificación. Intenta nuevamente.",
          code: "CARD_VERIFICATION_QUEUE_FAILED",
        },
        { status: 500 },
      );
    }

    try {
      const dispatchResult = await dispatchQueuedEmailById(queuedEmail.id);

      const emailSent = dispatchResult.sent === 1;

      return NextResponse.json({
        ok: true,
        emailSent,
        emailQueued: true,
        emailQueueId: queuedEmail.id,
        code: emailSent
          ? "CARD_VERIFICATION_RESENT"
          : "CARD_VERIFICATION_PENDING",
        message: emailSent
          ? "Correo de verificación reenviado"
          : "El correo de verificación quedó pendiente de envío.",
      });
    } catch (dispatchError) {
      console.error(
        "Error despachando reenvío de verificación:",
        dispatchError,
      );

      return NextResponse.json({
        ok: true,
        emailSent: false,
        emailQueued: true,
        emailQueueId: queuedEmail.id,
        code: "CARD_VERIFICATION_PENDING",
        message: "El correo de verificación quedó pendiente de envío.",
      });
    }
  } catch (error) {
    console.error("Error en /api/resend-verification:", error);

    return NextResponse.json(
      { error: "No se pudo reenviar el correo de verificación" },
      { status: 500 },
    );
  }
}
