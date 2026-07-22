import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { InventoryBatchItem } from "@/lib/inventory/batches";

type InventoryItemRow = {
  id: number;
  code: string;
  name: string;
  option_value_id: number | null;
  inventory_stock:
    | { quantity: number | string; updated_at: string | null }
    | { quantity: number | string; updated_at: string | null }[]
    | null;
  catalog_option_values:
    | { id: number; name: string }
    | { id: number; name: string }[]
    | null;
};

type OpenBatchRow = {
  inventory_item_id: number;
  opened_at: string;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function loadBatchItems(): Promise<InventoryBatchItem[]> {
  const [
    { data: itemRows, error: itemsError },
    { data: openRows, error: openError },
  ] = await Promise.all([
    supabaseAdmin
      .from("inventory_items")
      .select(
        `
            id,
            code,
            name,
            option_value_id,
            inventory_stock (
              quantity,
              updated_at
            ),
            catalog_option_values!inventory_items_option_value_id_fkey (
              id,
              name
            )
          `,
      )
      .eq("item_type", "BATCH")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("inventory_batches")
      .select("inventory_item_id, opened_at")
      .eq("status", "OPEN"),
  ]);

  if (itemsError) {
    throw new Error(`No fue posible obtener las bachas: ${itemsError.message}`);
  }

  if (openError) {
    throw new Error(
      `No fue posible obtener las bachas abiertas: ${openError.message}`,
    );
  }

  const openByItem = new Map<number, string>();

  for (const row of (openRows ?? []) as OpenBatchRow[]) {
    openByItem.set(Number(row.inventory_item_id), row.opened_at);
  }

  return ((itemRows ?? []) as InventoryItemRow[])
    .filter((row) => Number.isInteger(Number(row.option_value_id)))
    .map((row) => {
      const stock = firstRelation(row.inventory_stock);
      const optionValue = firstRelation(row.catalog_option_values);
      const openedAt = openByItem.get(Number(row.id)) ?? null;

      return {
        inventoryItemId: Number(row.id),
        code: row.code,
        name: row.name,
        optionValueId: Number(row.option_value_id),
        optionValueName:
          optionValue?.name ?? row.name.replace(/^Bacha\s+/i, ""),
        stock: Number(stock?.quantity ?? 0),
        stockUpdatedAt: stock?.updated_at ?? null,
        isOpen: Boolean(openedAt),
        openedAt,
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
    const items = await loadBatchItems();

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("Error cargando bachas de inventario:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar las bachas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as { inventoryItemId?: unknown };
    const inventoryItemId = Number(body.inventoryItemId);

    if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
      return NextResponse.json(
        { ok: false, message: "La bacha indicada no es válida." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.rpc("open_inventory_batch", {
      p_inventory_item_id: inventoryItemId,
      p_receipt_transaction_item_id: null,
      p_opened_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error ejecutando open_inventory_batch:", error);

      return NextResponse.json(
        {
          ok: false,
          message: error.message || "No fue posible abrir la bacha.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error abriendo bacha:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible abrir la bacha.",
      },
      { status: 500 },
    );
  }
}
