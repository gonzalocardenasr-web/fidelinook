export type InventoryStockItem = {
  inventoryItemId: number;
  category: string;
  sku: string;
  productName: string;
  unit: string;

  openingStock: number;
  dayVariation: number;
  currentStock: number;

  lastMovementAt: string | null;
};

export type InventoryStockResponse = {
  ok: boolean;
  items?: InventoryStockItem[];
  message?: string;
};

export async function getInventoryStock(): Promise<InventoryStockResponse> {
  const response = await fetch("/api/operacion/inventario/stock", {
    method: "GET",
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `La API de stock respondió con un formato inválido (${response.status}).`,
    );
  }

  const payload = (await response.json()) as InventoryStockResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.message || "No fue posible cargar el stock operacional.",
    );
  }

  return payload;
}
