import { supabase } from "@/lib/supabase";

export async function postInventoryReceipt(
  transactionId: number,
): Promise<void> {
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("La recepción indicada no es válida.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `No fue posible identificar al usuario: ${userError.message}`,
    );
  }

  if (!user) {
    throw new Error(
      "Tu sesión no se encuentra activa. Inicia sesión nuevamente.",
    );
  }

  const { error } = await supabase.rpc("post_inventory_transaction", {
    p_transaction_id: transactionId,
    p_posted_by: user.id,
  });

  if (error) {
    throw new Error(`No fue posible publicar la recepción: ${error.message}`);
  }
}
