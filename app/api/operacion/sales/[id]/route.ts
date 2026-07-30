import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
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
      {
        status: 401,
      },
    );
  }

  try {
    const params = await context.params;
    const saleId = Number(params.id);

    if (!Number.isInteger(saleId) || saleId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Identificador de venta inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("sales")
      .select(
        `
          id,
          sale_number,
          cash_register_session_id,
          channel,
          external_order_id,
          integration_source,
          received_at,
          customer_id,
          status,
          subtotal,
          discount_total,
          manual_discount_type,
          manual_discount_value,
          manual_discount_amount,
          manual_discount_reason,
          manual_discount_notes,
          total,
          payment_status,
          payment_method,
          actor_role,
          confirmed_at,
          created_at,
          clientes (
            id,
            nombre,
            correo,
            telefono
          ),
          orders (
            id,
            business_date,
            daily_order_number,
            display_order_code,
            status,
            notes,
            created_at
          ),
          sale_items (
            id,
            product_sku,
            product_name,
            quantity,
            list_unit_price,
            unit_price,
            discount_total,
            total_price,
            is_gift,
            gift_reason,
            notes,
            sale_item_options (
              id,
              option_group_code,
              option_value_name,
              quantity
            )
          )
        `,
      )
      .eq("id", saleId)
      .maybeSingle();

    if (error) {
      console.error("Error consultando detalle de venta:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar la venta.",
        },
        {
          status: 500,
        },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          message: "La venta solicitada no existe.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      sale: data,
    });
  } catch (error) {
    console.error("Error inesperado consultando detalle de venta:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al consultar la venta.",
      },
      {
        status: 500,
      },
    );
  }
}
