import { supabase } from "@/lib/supabase";

export type SaveInventoryReceiptItemInput = {
  transactionId: number;
  inventoryItemCode: string;
  quantity: number;
  unitCost: number | null;
  notes: string;
};

export async function saveInventoryReceiptItem(
  input: SaveInventoryReceiptItemInput,
): Promise<number> {
  if (!Number.isInteger(input.transactionId) || input.transactionId <= 0) {
    throw new Error("La recepción indicada no es válida.");
  }

  if (!input.inventoryItemCode.trim()) {
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

  const { data, error } = await supabase.rpc("add_inventory_transaction_item", {
    p_transaction_id: input.transactionId,
    p_inventory_item_code: input.inventoryItemCode.trim(),
    p_quantity_change: input.quantity,
    p_unit_cost: input.unitCost,
    p_notes: input.notes.trim() || null,
  });

  if (error) {
    throw new Error(`No fue posible guardar el producto: ${error.message}`);
  }

  const transactionItemId = Number(data);

  if (!Number.isInteger(transactionItemId) || transactionItemId <= 0) {
    throw new Error(
      "La base de datos no devolvió un identificador de línea válido.",
    );
  }

  return transactionItemId;
}
