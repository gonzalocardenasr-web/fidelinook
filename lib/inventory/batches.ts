export type InventoryBatchItem = {
  inventoryItemId: number;
  code: string;
  name: string;
  optionValueId: number;
  optionValueName: string;
  stock: number;
  stockUpdatedAt: string | null;
  isOpen: boolean;
  openedAt: string | null;
};

export type InventoryBatchesResponse = {
  ok: boolean;
  items?: InventoryBatchItem[];
  message?: string;
};

export async function getInventoryBatches(): Promise<InventoryBatchItem[]> {
  const response = await fetch("/api/operacion/inventario/bachas", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as InventoryBatchesResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "No fue posible cargar las bachas.");
  }

  return payload.items ?? [];
}

export async function openInventoryBatch(
  inventoryItemId: number,
): Promise<void> {
  const response = await fetch("/api/operacion/inventario/bachas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inventoryItemId }),
  });

  const payload = (await response.json()) as InventoryBatchesResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "No fue posible abrir la bacha.");
  }
}
