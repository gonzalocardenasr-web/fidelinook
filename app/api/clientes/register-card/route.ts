import { NextResponse } from "next/server";
import {
  createCustomerRecord,
  deleteCustomerRecord,
  getCustomerRegistrationErrorResponse,
  recordCustomerRegisteredEvent,
} from "../../../../lib/customer-registration";
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
     * El correo es un efecto posterior. Si falla, conservamos
     * cliente y evento para permitir su reenvío posteriormente.
     */
    let emailSent = false;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");

      if (!baseUrl) {
        console.error("NEXT_PUBLIC_BASE_URL no está configurada.");
      } else {
        const emailResponse = await fetch(`${baseUrl}/api/send-verification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customer.correo,
            nombre: customer.nombre,
            token: verificationToken,
          }),
        });

        emailSent = emailResponse.ok;

        if (!emailResponse.ok) {
          console.error(
            "El endpoint de verificación respondió con error:",
            emailResponse.status,
          );
        }
      }
    } catch (emailError) {
      console.error("Error enviando verificación de tarjeta:", emailError);
    }

    return NextResponse.json({
      ok: true,
      customerId: customer.id,
      publicToken: customer.public_token,
      emailSent,
      code: emailSent ? "CARD_REGISTERED" : "CARD_REGISTERED_EMAIL_FAILED",
      message: emailSent
        ? "Tarjeta registrada correctamente. Revisa tu correo para activarla."
        : "La tarjeta fue registrada, pero no se pudo enviar el correo de verificación.",
    });
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
