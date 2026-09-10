export async function cancelInventoryReceipt(
  transactionId: number,
): Promise<void> {
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("La recepción indicada no es válida.");
  }

  const response = await fetch("/api/operacion/inventario/recepciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "cancel",
      transactionId,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No fue posible cancelar la recepción.");
  }
}
