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
    inventoryItemId?: unknown;
    consumptionQuantity?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Solicitud inválida." },
      { status: 400 },
    );
  }

  const inventoryItemId = Number(body.inventoryItemId);
  const consumptionQuantity = Number(body.consumptionQuantity);

  if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
    return NextResponse.json(
      { ok: false, message: "Ítem de inventario inválido." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(consumptionQuantity) || consumptionQuantity <= 0) {
    return NextResponse.json(
      { ok: false, message: "El consumo debe ser mayor que cero." },
      { status: 400 },
    );
  }

  const { data: inventoryItem, error: inventoryItemError } = await supabaseAdmin
    .from("inventory_items")
    .select("id, product_id, option_value_id, is_active")
    .eq("id", inventoryItemId)
    .maybeSingle();

  if (inventoryItemError) {
    return NextResponse.json(
      { ok: false, message: inventoryItemError.message },
      { status: 500 },
    );
  }

  if (!inventoryItem) {
    return NextResponse.json(
      { ok: false, message: "Ítem de inventario no encontrado." },
      { status: 404 },
    );
  }

  if (!inventoryItem.is_active) {
    return NextResponse.json(
      { ok: false, message: "El ítem de inventario está inactivo." },
      { status: 409 },
    );
  }

  const { data: updatedItem, error: updateError } = await supabaseAdmin
    .from("inventory_items")
    .update({
      consumption_quantity: consumptionQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventoryItemId)
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
    .single();

  if (updateError) {
    return NextResponse.json(
      { ok: false, message: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    inventoryItem: updatedItem,
  });
}
