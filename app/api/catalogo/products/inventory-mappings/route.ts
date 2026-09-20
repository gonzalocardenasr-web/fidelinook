import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function PATCH(request: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  let body: {
    productId?: unknown;
    inventoryItemId?: unknown;
    quantity?: unknown;
    isActive?: unknown;
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
  const inventoryItemId = Number(body.inventoryItemId);
  const quantity = Number(body.quantity);
  const isActive = body.isActive;

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json(
      { ok: false, message: "Producto inválido." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
    return NextResponse.json(
      { ok: false, message: "Ítem de inventario inválido." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { ok: false, message: "La cantidad debe ser mayor que cero." },
      { status: 400 },
    );
  }

  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, message: "Estado de mapping inválido." },
      { status: 400 },
    );
  }

  const { data: mappingId, error: mappingError } = await supabaseAdmin.rpc(
    "set_product_inventory_mapping",
    {
      p_product_id: productId,
      p_inventory_item_id: inventoryItemId,
      p_quantity: quantity,
      p_is_active: isActive,
    },
  );

  if (mappingError) {
    const message = mappingError.message || "No se pudo actualizar el mapping.";

    const isBusinessConflict =
      message.includes("no puede consumirse a sí mismo") ||
      message.includes("inventario directo activo") ||
      message.includes("ítem de inventario está inactivo") ||
      message.includes("componente debe corresponder") ||
      message.includes("componente no está asociado");

    return NextResponse.json(
      { ok: false, message },
      { status: isBusinessConflict ? 409 : 500 },
    );
  }

  const { data: mapping, error: readError } = await supabaseAdmin
    .from("product_inventory_mappings")
    .select(
      `
      id,
      product_id,
      inventory_item_id,
      quantity,
      is_active,
      notes,
      inventory_items (
        id,
        code,
        name,
        item_type,
        unit,
        product_id,
        option_value_id,
        inventory_source,
        is_active
      )
    `,
    )
    .eq("id", Number(mappingId))
    .single();

  if (readError) {
    return NextResponse.json(
      { ok: false, message: readError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mapping,
  });
}
