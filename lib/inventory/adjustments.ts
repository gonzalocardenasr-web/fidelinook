export type InventoryAdjustmentKind =
  | "ADJUSTMENT_POSITIVE"
  | "ADJUSTMENT_NEGATIVE"
  | "WASTE"
  | "INTERNAL_CONSUMPTION";

export type InventoryAdjustmentItem = {
  inventoryItemId: number;
  code: string;
  name: string;
  itemType: string;
  unit: string;
  stock: number;
  stockUpdatedAt: string | null;
};

export type InventoryAdjustmentsResponse = {
  ok: boolean;
  items?: InventoryAdjustmentItem[];
  remainingStock?: number;
  transactionId?: number;
  message?: string;
};

export type RegisterInventoryAdjustmentInput = {
  kind: InventoryAdjustmentKind;
  inventoryItemId: number;
  quantity: number;
  reason: string;
  comment: string;
};

export async function getInventoryAdjustmentItems(): Promise<
  InventoryAdjustmentItem[]
> {
  const response = await fetch("/api/operacion/inventario/ajustes", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as InventoryAdjustmentsResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "No fue posible cargar el inventario.");
  }

  return payload.items ?? [];
}

export async function registerInventoryAdjustment(
  input: RegisterInventoryAdjustmentInput,
): Promise<InventoryAdjustmentsResponse> {
  const response = await fetch("/api/operacion/inventario/ajustes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as InventoryAdjustmentsResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.message || "No fue posible registrar el movimiento.",
    );
  }

  return payload;
}
