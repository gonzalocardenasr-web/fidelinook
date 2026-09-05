export async function postInventoryReceipt(
  transactionId: number,
): Promise<void> {
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("La recepción indicada no es válida.");
  }

  const response = await fetch("/api/operacion/inventario/recepciones/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionId,
    }),
  });

  let payload: {
    ok?: boolean;
    message?: string;
  } | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.message || "No fue posible publicar la recepción.",
    );
  }
}
