import { supabase } from "@/lib/supabase";

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
  const { data, error } = await supabase.rpc("create_inventory_transaction", {
    p_transaction_type_code: "PURCHASE",
    p_supplier_id: input.supplierId,
    p_reference_type: input.referenceType || null,
    p_reference_number: input.referenceNumber || null,
    p_transaction_date: new Date(input.transactionDate).toISOString(),
    p_notes: input.notes || null,
  });

  if (error) {
    throw new Error(`No fue posible crear la recepción: ${error.message}`);
  }

  const transactionId = Number(data);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("La recepción fue creada sin un identificador válido.");
  }

  return transactionId;
}
