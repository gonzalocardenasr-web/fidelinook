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

type InventoryItemsResponse = {
  ok?: boolean;
  message?: string;
  items?: InventoryItemRow[];
};

export async function getActiveInventoryItems(): Promise<
  ActiveInventoryItem[]
> {
  const response = await fetch("/api/operacion/inventario/recepciones", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as InventoryItemsResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.message ?? "No fue posible obtener los productos de inventario.",
    );
  }

  return (payload.items ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    itemType: item.item_type,
    unit: item.unit,
  }));
}
