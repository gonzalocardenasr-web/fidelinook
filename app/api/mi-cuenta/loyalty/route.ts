import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getCustomerLoyalty } from "../../../../lib/loyalty";

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export async function GET(req: Request) {
  try {
    const accessToken = getBearerToken(req);

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          message: "La sesión no es válida.",
        },
        { status: 401 },
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error(
        "Error buscando cliente autenticado para fidelización:",
        customerError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo consultar la tarjeta.",
        },
        { status: 500 },
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "No encontramos una tarjeta asociada a esta cuenta.",
        },
        { status: 404 },
      );
    }

    const loyalty = await getCustomerLoyalty(Number(customer.id));

    return NextResponse.json({
      ok: true,
      loyalty,
    });
  } catch (error) {
    console.error("Error cargando fidelización de mi cuenta:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error al consultar la fidelización.",
      },
      { status: 500 },
    );
  }
}
