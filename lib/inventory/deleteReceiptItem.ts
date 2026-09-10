export async function deleteInventoryReceiptItem(
  transactionItemId: number,
): Promise<void> {
  if (!Number.isInteger(transactionItemId) || transactionItemId <= 0) {
    throw new Error("La línea indicada no es válida.");
  }

  const response = await fetch("/api/operacion/inventario/recepciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "delete_item",
      transactionItemId,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No fue posible eliminar el producto.");
  }
}
