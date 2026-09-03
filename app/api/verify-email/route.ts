import { NextResponse } from "next/server";
import {
  activateCustomerByToken,
  getCustomerActivationErrorResponse,
} from "../../../lib/customer-activation";
import { dispatchQueuedEmailById } from "../../../lib/email/emailDispatcher";
import { enqueueEmail } from "../../../lib/email/emailQueue";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get("token") || "").trim();

    const customer = await activateCustomerByToken({
      token,
      source: "card_verification",
    });

    /*
     * El correo es posterior al hecho de activación.
     * Si falla, la tarjeta continúa activa.
     */
    if (customer.activated) {
      try {
        const queuedEmail = await enqueueEmail({
          recipientEmail: customer.correo,
          emailType: "CARD_ACTIVATED",
          priority: 1,
          idempotencyKey: `card-activated:${customer.eventId}`,
          payload: {
            nombre: customer.nombre,
            publicToken: customer.publicToken,
          },
          customerId: customer.customerId,
          sourceType: "card_activation",
          sourceReference: String(customer.eventId),
          maxAttempts: 5,
        });

        await dispatchQueuedEmailById(queuedEmail.id);
      } catch (emailError) {
        console.error(
          "Error encolando/despachando correo de tarjeta activa:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      ya_verificado: customer.alreadyActive,
      public_token: customer.publicToken,
      correo: customer.correo,
    });
  } catch (error) {
    console.error("Error en /api/verify-email:", error);

    const response = getCustomerActivationErrorResponse(error);

    return NextResponse.json(
      {
        ok: false,
        error: response.body.message,
        code: response.body.code,
      },
      { status: response.status },
    );
  }
}
