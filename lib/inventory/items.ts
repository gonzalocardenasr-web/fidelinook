import { supabase } from "@/lib/supabase";

export type ActiveInventoryItem = {
  id: number;
  code: string;
  name: string;
  itemType: string;
  unit: string;
};

type InventoryItemRow = {
  id: number;
  code: string;
  name: string;
  item_type: string;
  unit: string;
};

export async function getActiveInventoryItems(): Promise<
  ActiveInventoryItem[]
> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      `
      id,
      code,
      name,
      item_type,
      unit
    `,
    )
    .eq("is_active", true)
    .order("item_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `No fue posible obtener los productos de inventario: ${error.message}`,
    );
  }

  return ((data ?? []) as InventoryItemRow[]).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    itemType: item.item_type,
    unit: item.unit,
  }));
}
