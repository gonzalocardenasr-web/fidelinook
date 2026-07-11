import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

export async function GET() {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      sale_id,
      business_date,
      daily_order_number,
      display_order_code,
      status,
      preparation_started_at,
      ready_at,
      delivered_at,
      cancelled_at,
      created_at,
      notes,
      sales (
        id,
        customer_id,
        total,
        payment_method,
        channel,
        clientes (
          id,
          nombre,
          correo,
          telefono
        ),
        sale_items (
          id,
          product_sku,
          product_name,
          quantity,
          notes,
          sale_item_options (
            id,
            option_group_code,
            option_value_name,
            quantity
          )
        )
      )
    `,
    )
    .not("status", "in", "(delivered,cancelled)")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    orders: data || [],
  });
}
