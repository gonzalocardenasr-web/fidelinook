import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(request: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  let body: {
    productId?: unknown;
    optionValueId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Solicitud inválida." },
      { status: 400 },
    );
  }

  const productId = Number(body.productId);
  const optionValueId = Number(body.optionValueId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json(
      { ok: false, message: "Producto inválido." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(optionValueId) || optionValueId <= 0) {
    return NextResponse.json(
      { ok: false, message: "Sabor inválido." },
      { status: 400 },
    );
  }

  const { data: inventoryItemId, error: createError } = await supabaseAdmin.rpc(
    "create_product_inventory_variant",
    {
      p_product_id: productId,
      p_option_value_id: optionValueId,
      p_item_type: "PREPARED_PRODUCT",
      p_unit: "UNIT",
      p_consumption_quantity: 1,
    },
  );

  if (createError) {
    const message =
      createError.message || "No se pudo crear la variante de inventario.";

    const isBusinessConflict =
      message.includes("ya existe") ||
      message.includes("no está configurado") ||
      message.includes("grupo de sabores") ||
      message.includes("debe pertenecer") ||
      message.includes("está inactivo");

    return NextResponse.json(
      { ok: false, message },
      { status: isBusinessConflict ? 409 : 500 },
    );
  }

  const { data: inventoryItem, error: readError } = await supabaseAdmin
    .from("inventory_items")
    .select(
      `
        id,
        code,
        name,
        product_id,
        option_value_id,
        consumption_quantity,
        unit,
        inventory_source,
        is_active
      `,
    )
    .eq("id", Number(inventoryItemId))
    .single();

  if (readError) {
    return NextResponse.json(
      { ok: false, message: readError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    inventoryItem,
  });
}
