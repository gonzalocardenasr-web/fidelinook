import { NextResponse } from "next/server";
import {
  activateCustomerByToken,
  getCustomerActivationErrorResponse,
} from "../../../../lib/customer-activation";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get("token") || "").trim();

    const customer = await activateCustomerByToken({
      token,
      source: "account_verification",
    });

    return NextResponse.json({
      ok: true,
      ya_verificado: customer.alreadyActive,
      correo: customer.correo,
      public_token: customer.publicToken,
    });
  } catch (error) {
    console.error("Error en /api/register/verify:", error);

    const response = getCustomerActivationErrorResponse(error);

    return NextResponse.json(
      {
        ok: false,
        message: response.body.message,
        code: response.body.code,
      },
      { status: response.status },
    );
  }
}
