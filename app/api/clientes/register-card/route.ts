import { NextResponse } from "next/server";

import {
  createCustomerRecord,
  deleteCustomerRecord,
  getCustomerRegistrationErrorResponse,
  recordCustomerRegisteredEvent,
} from "../../../../lib/customer-registration";

import { dispatchQueuedEmailById } from "../../../../lib/email/emailDispatcher";
import { enqueueEmail } from "../../../../lib/email/emailQueue";
import { generateVerificationToken } from "../../../../lib/utils/generateVerificationToken";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nombre = String(body.nombre || "").trim();
    const correo = String(body.correo || "")
      .trim()
      .toLowerCase();
    const telefono = String(body.telefono || "").trim();

    const aceptaTerminos = Boolean(body.aceptaTerminos);
    const aceptaMarketing = Boolean(body.aceptaMarketing);

    const verificationToken = generateVerificationToken();
    const verificationCreatedAt = new Date().toISOString();

    const customer = await createCustomerRecord({
      nombre,
      correo,
      telefono,
      verificationToken,
      verificationTokenCreatedAt: verificationCreatedAt,
      emailVerified: false,
      cardActive: false,
      acceptsTerms: aceptaTerminos,
      acceptsMarketing: aceptaMarketing,
      marketingPreferenceDefined: true,
      termsVersion: "v1.0",
      acceptedAt: verificationCreatedAt,
    });

    /*
     * El registro no se considera completo hasta que el evento
     * transversal haya quedado creado.
     */
    try {
      await recordCustomerRegisteredEvent({
        customer,
        source: "card_registration",
        metadata: {
          acceptsMarketing: aceptaMarketing,
          marketingPreferenceDefined: true,
          termsVersion: "v1.0",
        },
      });
    } catch (eventError) {
      console.error(
        "Cliente creado, pero falló customer.registered:",
        eventError,
      );

      const rollbackCompleted = await deleteCustomerRecord(customer.id);

      if (!rollbackCompleted) {
        return NextResponse.json(
          {
            ok: false,
            code: "CUSTOMER_EVENT_FAILED_ROLLBACK_FAILED",
            message:
              "El cliente fue creado, pero ocurrió un problema de trazabilidad. No repitas el registro y contacta al administrador.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: "CUSTOMER_EVENT_FAILED",
          message:
            "No se pudo completar el registro. La operación fue revertida.",
        },
        { status: 500 },
      );
    }

    /*
     * El correo es un efecto posterior al registro.
     * La obligación debe quedar persistida antes de intentar enviarla.
     */
    let queuedEmail;

    try {
      queuedEmail = await enqueueEmail({
        recipientEmail: customer.correo,
        emailType: "REGISTER_VERIFICATION",
        priority: 0,
        idempotencyKey: `card-registration-verification:${customer.id}:${verificationToken}`,
        payload: {
          nombre: customer.nombre,
          token: verificationToken,
        },
        customerId: customer.id,
        sourceType: "card_registration",
        sourceReference: String(customer.id),
        maxAttempts: 5,
      });
    } catch (queueError) {
      console.error(
        "Cliente creado, pero no se pudo encolar correo de verificación:",
        queueError,
      );

      return NextResponse.json({
        ok: true,
        customerId: customer.id,
        publicToken: customer.public_token,
        emailSent: false,
        emailQueued: false,
        code: "CARD_REGISTERED_EMAIL_QUEUE_FAILED",
        message:
          "La tarjeta fue registrada, pero el correo de verificación requiere revisión.",
      });
    }

    /*
     * Intentamos envío inmediato de la obligación recién creada.
     * Si falla, la fila permanece disponible para retry.
     */
    try {
      const dispatchResult = await dispatchQueuedEmailById(queuedEmail.id);

      const emailSent = dispatchResult.sent === 1;

      return NextResponse.json({
        ok: true,
        customerId: customer.id,
        publicToken: customer.public_token,
        emailSent,
        emailQueued: true,
        emailQueueId: queuedEmail.id,
        code: emailSent ? "CARD_REGISTERED" : "CARD_REGISTERED_EMAIL_PENDING",
        message: emailSent
          ? "Tarjeta registrada correctamente. Revisa tu correo para activarla."
          : "La tarjeta fue registrada. El correo de verificación quedó pendiente de envío y será reintentado automáticamente.",
      });
    } catch (dispatchError) {
      console.error(
        "Correo de verificación encolado, pero falló el despacho inmediato:",
        dispatchError,
      );

      return NextResponse.json({
        ok: true,
        customerId: customer.id,
        publicToken: customer.public_token,
        emailSent: false,
        emailQueued: true,
        emailQueueId: queuedEmail.id,
        code: "CARD_REGISTERED_EMAIL_PENDING",
        message:
          "La tarjeta fue registrada. El correo de verificación quedó pendiente de envío y será reintentado automáticamente.",
      });
    }
  } catch (error) {
    console.error("Error registrando tarjeta de cliente:", error);

    /*
     * El servicio central puede lanzar una excepción después de
     * validar, pero antes del INSERT. En ese escenario no existe
     * ningún cliente que revertir.
     */
    const response = getCustomerRegistrationErrorResponse(error);

    return NextResponse.json(response.body, {
      status: response.status,
    });
  }
}
