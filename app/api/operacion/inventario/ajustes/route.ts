import { NextResponse } from "next/server";

import type {
  InventoryAdjustmentItem,
  InventoryAdjustmentKind,
} from "@/lib/inventory/adjustments";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_KINDS = new Set<InventoryAdjustmentKind>([
  "ADJUSTMENT_POSITIVE",
  "ADJUSTMENT_NEGATIVE",
  "WASTE",
  "INTERNAL_CONSUMPTION",
]);

type InventoryItemRow = {
  id: number;
  code: string;
  name: string;
  item_type: string;
  unit: string;
  inventory_stock:
    | { quantity: number | string; updated_at: string | null }
    | { quantity: number | string; updated_at: string | null }[]
    | null;
};

type AdjustmentRpcRow = {
  transaction_id: number;
  remaining_stock: number | string;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function loadItems(): Promise<InventoryAdjustmentItem[]> {
  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .select(
      `
        id,
        code,
        name,
        item_type,
        unit,
        inventory_stock (
          quantity,
          updated_at
        )
      `,
    )
    .eq("is_active", true)
    .order("item_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No fue posible obtener los SKU: ${error.message}`);
  }

  return ((data ?? []) as InventoryItemRow[]).map((row) => {
    const stock = firstRelation(row.inventory_stock);

    return {
      inventoryItemId: Number(row.id),
      code: row.code,
      name: row.name,
      itemType: row.item_type,
      unit: row.unit,
      stock: Number(stock?.quantity ?? 0),
      stockUpdatedAt: stock?.updated_at ?? null,
    };
  });
}

export async function GET() {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json({ ok: true, items: await loadItems() });
  } catch (error) {
    console.error("Error cargando SKU para ajustes:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el inventario.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getOperationSession();

  if (!session.ok || !session.role) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      kind?: unknown;
      inventoryItemId?: unknown;
      quantity?: unknown;
      reason?: unknown;
      comment?: unknown;
    };

    const kind = String(body.kind ?? "") as InventoryAdjustmentKind;
    const inventoryItemId = Number(body.inventoryItemId);
    const quantity = Number(body.quantity);
    const reason = String(body.reason ?? "").trim();
    const comment = String(body.comment ?? "").trim();

    if (!VALID_KINDS.has(kind)) {
      return NextResponse.json(
        { ok: false, message: "El tipo de movimiento no es válido." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Selecciona un SKU válido." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { ok: false, message: "La cantidad debe ser mayor que cero." },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { ok: false, message: "Selecciona o ingresa un motivo." },
        { status: 400 },
      );
    }

    if (!comment) {
      return NextResponse.json(
        { ok: false, message: "El comentario es obligatorio." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "register_inventory_adjustment",
      {
        p_operation: kind,
        p_inventory_item_id: inventoryItemId,
        p_quantity: quantity,
        p_reason: reason,
        p_comment: comment,
        p_operator_reference: session.role,
        p_occurred_at: new Date().toISOString(),
      },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }

    const result = ((data ?? []) as AdjustmentRpcRow[])[0];

    return NextResponse.json({
      ok: true,
      transactionId: result ? Number(result.transaction_id) : undefined,
      remainingStock: result ? Number(result.remaining_stock) : undefined,
    });
  } catch (error) {
    console.error("Error registrando ajuste de inventario:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible registrar el movimiento.",
      },
      { status: 500 },
    );
  }
}
