import { supabase } from "@/lib/supabase";

export async function cancelInventoryReceipt(
  transactionId: number,
): Promise<void> {
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("La recepción indicada no es válida.");
  }

  const { error } = await supabase.rpc("cancel_inventory_transaction", {
    p_transaction_id: transactionId,
  });

  if (error) {
    throw new Error(`No fue posible cancelar la recepción: ${error.message}`);
  }
}
