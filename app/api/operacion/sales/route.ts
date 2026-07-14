import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

export async function GET(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const requestedPage = Number(searchParams.get("page") || 1);
    const requestedPageSize = Number(searchParams.get("pageSize") || 50);

    const page =
      Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;

    const pageSize =
      Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.min(Math.floor(requestedPageSize), 100)
        : 50;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabaseAdmin
      .from("sales")
      .select(
        `
        id,
        sale_number,
        channel,
        external_order_id,
        integration_source,
        received_at,
        customer_id,
        status,
        subtotal,
        discount_total,
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
          unit_price,
          total_price,
          notes,
          sale_item_options (
            id,
            option_group_code,
            option_value_name,
            quantity
          )
        )
      `,
        {
          count: "exact",
        },
      )
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (dateFrom) {
      const parsedDateFrom = new Date(dateFrom);

      if (Number.isNaN(parsedDateFrom.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Fecha inicial inválida." },
          { status: 400 },
        );
      }

      query = query.gte("created_at", parsedDateFrom.toISOString());
    }

    if (dateTo) {
      const parsedDateTo = new Date(dateTo);

      if (Number.isNaN(parsedDateTo.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Fecha final inválida." },
          { status: 400 },
        );
      }

      query = query.lt("created_at", parsedDateTo.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      ok: true,
      sales: data || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        from: total === 0 ? 0 : rangeFrom + 1,
        to: Math.min(rangeFrom + (data?.length || 0), total),
      },
    });
  } catch (error) {
    console.error("Error cargando historial de ventas:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al cargar el historial de ventas.",
      },
      { status: 500 },
    );
  }
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

    const orderNotes = String(body.orderNotes || "").trim();

    const channel = String(body.channel || "local")
      .trim()
      .toLowerCase();

    const externalOrderId = String(body.externalOrderId || "").trim();

    const allowedChannels = [
      "local",
      "shopify",
      "uber_eats",
      "rappi",
      "pedidosya",
    ];

    if (!allowedChannels.includes(channel)) {
      return NextResponse.json(
        { ok: false, message: "Canal de venta inválido." },
        { status: 400 },
      );
    }

    if (channel !== "local" && !externalOrderId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Los pedidos digitales requieren un número externo.",
        },
        { status: 400 },
      );
    }

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
        p_order_notes: orderNotes || null,
        p_channel: channel,
        p_external_order_id: externalOrderId || null,
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
