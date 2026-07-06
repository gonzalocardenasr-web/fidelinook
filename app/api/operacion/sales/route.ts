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
    .from("sales")
    .select(
      `
      id,
      sale_number,
      channel,
      customer_id,
      status,
      subtotal,
      discount_total,
      total,
      payment_status,
      payment_method,
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
        status
      ),
      sale_items (
        id,
        product_sku,
        product_name,
        quantity,
        unit_price,
        total_price,
        sale_item_options (
          id,
          option_group_code,
          option_value_name,
          quantity
        )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, sales: data || [] });
}

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const customerId =
      body.customerId === null ||
      body.customerId === undefined ||
      body.customerId === ""
        ? null
        : Number(body.customerId);

    const paymentMethod = String(body.paymentMethod || "manual").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, message: "La venta debe tener al menos un producto." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "create_local_sale_with_order",
      {
        p_customer_id: customerId,
        p_payment_method: paymentMethod,
        p_items: items,
        p_actor_role: session.role,
      },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      result: data,
    });
  } catch (error) {
    console.error("Error creando venta:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al crear la venta." },
      { status: 500 },
    );
  }
}
