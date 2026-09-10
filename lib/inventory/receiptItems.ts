export type SaveInventoryReceiptItemInput = {
  transactionId: number;
  inventoryItemCode: string;
  quantity: number;
  unitCost: number | null;
  notes?: string | null;
};

export async function saveInventoryReceiptItem(
  input: SaveInventoryReceiptItemInput,
): Promise<number> {
  if (!Number.isFinite(input.transactionId) || input.transactionId <= 0) {
    throw new Error("La recepción indicada no es válida.");
  }

  const inventoryItemCode = input.inventoryItemCode.trim();

  if (!inventoryItemCode) {
    throw new Error("Debes seleccionar un producto.");
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }

  if (
    input.unitCost !== null &&
    (!Number.isFinite(input.unitCost) || input.unitCost < 0)
  ) {
    throw new Error("El costo unitario no puede ser negativo.");
  }

  const response = await fetch("/api/operacion/inventario/recepciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "add_item",
      transactionId: input.transactionId,
      inventoryItemCode,
      quantity: input.quantity,
      unitCost: input.unitCost,
      notes: input.notes ?? null,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No fue posible guardar el producto.");
  }

  const transactionItemId = Number(result.transactionItemId);

  if (!Number.isInteger(transactionItemId) || transactionItemId <= 0) {
    throw new Error(
      "La base de datos no devolvió un identificador de línea válido.",
    );
  }

  return transactionItemId;
}
