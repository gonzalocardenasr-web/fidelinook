import { NextResponse } from "next/server";

import type { InventoryStockItem } from "@/lib/inventory/stock";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type OperationalStockRow = {
  inventory_item_id: number | string;
  category: string;
  sku: string;
  product_name: string;
  unit: string;

  opening_stock: number | string;
  day_variation: number | string;
  current_stock: number | string;

  last_movement_at: string | null;
};

function mapStockItem(row: OperationalStockRow): InventoryStockItem {
  return {
    inventoryItemId: Number(row.inventory_item_id),
    category: row.category,
    sku: row.sku,
    productName: row.product_name,
    unit: row.unit,

    openingStock: Number(row.opening_stock),
    dayVariation: Number(row.day_variation),
    currentStock: Number(row.current_stock),

    lastMovementAt: row.last_movement_at,
  };
}

export async function GET() {
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
    const { data, error } = await supabaseAdmin.rpc(
      "get_operational_inventory_stock",
    );

    if (error) {
      throw new Error(
        `No fue posible consultar el stock operacional: ${error.message}`,
      );
    }

    const items = ((data ?? []) as OperationalStockRow[]).map(mapStockItem);

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("Error cargando stock operacional:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el stock operacional.",
      },
      {
        status: 500,
      },
    );
  }
}
