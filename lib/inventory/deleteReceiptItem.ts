import { supabase } from "@/lib/supabase";

export async function deleteInventoryReceiptItem(
  transactionItemId: number,
): Promise<void> {
  if (!Number.isInteger(transactionItemId) || transactionItemId <= 0) {
    throw new Error("La línea indicada no es válida.");
  }

  const { error } = await supabase.rpc("delete_inventory_transaction_item", {
    p_transaction_item_id: transactionItemId,
  });

  if (error) {
    throw new Error(`No fue posible eliminar el producto: ${error.message}`);
  }
}
