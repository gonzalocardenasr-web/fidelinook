import { supabase } from "@/lib/supabase";

export type InventoryReceiptListItem = {
  id: number;
  transactionDate: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  referenceNumber: string | null;
  supplierName: string | null;
  itemCount: number;
  totalUnits: number;
  totalCost: number;
  createdAt: string;
};

type ReceiptRow = {
  id: number;
  transaction_date: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  reference_number: string | null;
  created_at: string;
  suppliers:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  inventory_transaction_items:
    | {
        quantity_change: number | string;
        unit_cost: number | string | null;
      }[]
    | null;
};

function getSupplierName(supplier: ReceiptRow["suppliers"]): string | null {
  if (!supplier) {
    return null;
  }

  if (Array.isArray(supplier)) {
    return supplier[0]?.name ?? null;
  }

  return supplier.name;
}

export async function getInventoryReceipts(): Promise<
  InventoryReceiptListItem[]
> {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(
      `
      id,
      transaction_date,
      status,
      reference_number,
      created_at,
      suppliers (
        name
      ),
      inventory_transaction_items (
        quantity_change,
        unit_cost
      ),
      inventory_transaction_types!inner (
        code
      )
    `,
    )
    .eq("inventory_transaction_types.code", "PURCHASE")
    .order("transaction_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(`No fue posible obtener las recepciones: ${error.message}`);
  }

  return ((data ?? []) as ReceiptRow[]).map((receipt) => {
    const items = receipt.inventory_transaction_items ?? [];

    const totalUnits = items.reduce(
      (sum, item) => sum + Number(item.quantity_change),
      0,
    );

    const totalCost = items.reduce(
      (sum, item) =>
        sum + Number(item.quantity_change) * Number(item.unit_cost ?? 0),
      0,
    );

    return {
      id: receipt.id,
      transactionDate: receipt.transaction_date,
      status: receipt.status,
      referenceNumber: receipt.reference_number,
      supplierName: getSupplierName(receipt.suppliers),
      itemCount: items.length,
      totalUnits,
      totalCost,
      createdAt: receipt.created_at,
    };
  });
}
