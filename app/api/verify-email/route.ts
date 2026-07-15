import { NextResponse } from "next/server";
import {
  activateCustomerByToken,
  getCustomerActivationErrorResponse,
} from "../../../lib/customer-activation";
import { sendCardActivatedEmail } from "../../../lib/email/sendCardActivatedEmail";

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
        await sendCardActivatedEmail(
          customer.correo,
          customer.nombre,
          customer.publicToken,
        );
      } catch (emailError) {
        console.error("Error enviando correo de tarjeta activa:", emailError);
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
