export type InventoryMovement = {
  id: number;
  createdAt: string;

  inventoryItemId: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  unit: string;

  transactionId: number;
  transactionTypeCode: string;
  transactionTypeName: string;

  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;

  transactionDate: string | null;
  referenceType: string | null;
  referenceId: number | null;
  referenceNumber: string | null;

  operator: string | null;
  transactionNotes: string | null;
  itemNotes: string | null;
};

export type InventoryMovementFilters = {
  dateFrom: string;
  dateTo: string;
  itemSearch: string;
  movementType: string;
  operator: string;
  reference: string;
};

export type InventoryMovementOption = {
  value: string;
  label: string;
};

export type InventoryMovementsResponse = {
  ok: boolean;
  movements?: InventoryMovement[];
  movementTypes?: InventoryMovementOption[];
  operators?: InventoryMovementOption[];
  message?: string;
};

function buildQueryString(filters: InventoryMovementFilters): string {
  const params = new URLSearchParams();

  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.itemSearch.trim()) {
    params.set("itemSearch", filters.itemSearch.trim());
  }
  if (filters.movementType) {
    params.set("movementType", filters.movementType);
  }
  if (filters.operator) {
    params.set("operator", filters.operator);
  }
  if (filters.reference.trim()) {
    params.set("reference", filters.reference.trim());
  }

  return params.toString();
}

export async function getInventoryMovements(
  filters: InventoryMovementFilters,
): Promise<InventoryMovementsResponse> {
  const queryString = buildQueryString(filters);

  const response = await fetch(
    `/api/operacion/inventario/movimientos${
      queryString ? `?${queryString}` : ""
    }`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `La API de movimientos respondió con un formato inválido (${response.status}).`,
    );
  }

  const payload = (await response.json()) as InventoryMovementsResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.message || "No fue posible cargar los movimientos.",
    );
  }

  return payload;
}
