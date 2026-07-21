import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../../lib/operation-auth";
import { getCustomerLoyalty } from "../../../../../../lib/loyalty";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autenticado.",
      },
      { status: 401 },
    );
  }

  try {
    const { customerId: customerIdParam } = await context.params;
    const customerId = Number(customerIdParam);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cliente inválido.",
        },
        { status: 400 },
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("id", customerId)
      .maybeSingle();

    if (customerError) {
      console.error(
        "Error verificando cliente para consulta de fidelización:",
        customerError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo consultar el cliente.",
        },
        { status: 500 },
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cliente no encontrado.",
        },
        { status: 404 },
      );
    }

    const loyalty = await getCustomerLoyalty(customerId);

    return NextResponse.json({
      ok: true,
      loyalty,
    });
  } catch (error) {
    console.error("Error cargando fidelización para operación:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error al consultar la fidelización.",
      },
      { status: 500 },
    );
  }
}
