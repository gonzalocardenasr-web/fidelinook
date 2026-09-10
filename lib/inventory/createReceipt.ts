export type CreateInventoryReceiptInput = {
  supplierId: number;
  referenceType: "PURCHASE" | "INITIAL_STOCK";
  referenceNumber: string;
  transactionDate: string;
  notes: string;
};

export async function createInventoryReceipt(
  input: CreateInventoryReceiptInput,
): Promise<number> {
  const response = await fetch("/api/operacion/inventario/recepciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "create",
      supplierId: input.supplierId,
      referenceType: input.referenceType,
      referenceNumber: input.referenceNumber,
      transactionDate: input.transactionDate,
      notes: input.notes,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No fue posible crear la recepción.");
  }

  const transactionId = Number(result.transactionId);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("La recepción fue creada sin un identificador válido.");
  }

  return transactionId;
}
