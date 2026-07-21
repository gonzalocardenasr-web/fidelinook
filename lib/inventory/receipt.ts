import { supabase } from "@/lib/supabase";

export type InventoryReceiptStatus = "DRAFT" | "POSTED" | "CANCELLED";

export type InventoryReceiptItem = {
  id: number;
  inventoryItemId: number;
  inventoryItemCode: string;
  inventoryItemName: string;
  itemType: string;
  unit: string;
  quantity: number;
  unitCost: number | null;
  notes: string | null;
  totalCost: number;
};

export type InventoryReceiptDetail = {
  id: number;
  transactionDate: string;
  status: InventoryReceiptStatus;
  supplierId: number | null;
  supplierName: string | null;
  referenceType: string | null;
  referenceNumber: string | null;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InventoryReceiptItem[];
  totalUnits: number;
  totalCost: number;
};

type SupplierRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type InventoryItemRelation =
  | {
      id: number;
      code: string;
      name: string;
      item_type: string;
      unit: string;
    }
  | {
      id: number;
      code: string;
      name: string;
      item_type: string;
      unit: string;
    }[]
  | null;

type ReceiptItemRow = {
  id: number;
  inventory_item_id: number;
  quantity_change: number | string;
  unit_cost: number | string | null;
  notes: string | null;
  inventory_items: InventoryItemRelation;
};

type ReceiptDetailRow = {
  id: number;
  transaction_date: string;
  status: InventoryReceiptStatus;
  supplier_id: number | null;
  reference_type: string | null;
  reference_number: string | null;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  suppliers: SupplierRelation;
  inventory_transaction_items: ReceiptItemRow[] | null;
};

function getSupplierName(supplier: SupplierRelation): string | null {
  if (!supplier) {
    return null;
  }

  if (Array.isArray(supplier)) {
    return supplier[0]?.name ?? null;
  }

  return supplier.name;
}

function getInventoryItem(inventoryItem: InventoryItemRelation): {
  id: number;
  code: string;
  name: string;
  itemType: string;
  unit: string;
} | null {
  if (!inventoryItem) {
    return null;
  }

  const item = Array.isArray(inventoryItem) ? inventoryItem[0] : inventoryItem;

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    itemType: item.item_type,
    unit: item.unit,
  };
}

export async function getInventoryReceiptById(
  transactionId: number,
): Promise<InventoryReceiptDetail> {
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("El identificador de la recepción no es válido.");
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(
      `
      id,
      transaction_date,
      status,
      supplier_id,
      reference_type,
      reference_number,
      notes,
      posted_at,
      created_at,
      updated_at,
      suppliers (
        name
      ),
      inventory_transaction_items (
        id,
        inventory_item_id,
        quantity_change,
        unit_cost,
        notes,
        inventory_items (
          id,
          code,
          name,
          item_type,
          unit
        )
      ),
      inventory_transaction_types!inner (
        code
      )
    `,
    )
    .eq("id", transactionId)
    .eq("inventory_transaction_types.code", "PURCHASE")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("La recepción indicada no existe.");
    }

    throw new Error(`No fue posible obtener la recepción: ${error.message}`);
  }

  const receipt = data as ReceiptDetailRow;

  const items: InventoryReceiptItem[] = (
    receipt.inventory_transaction_items ?? []
  )
    .map((row) => {
      const inventoryItem = getInventoryItem(row.inventory_items);

      if (!inventoryItem) {
        return null;
      }

      const quantity = Number(row.quantity_change);
      const unitCost = row.unit_cost === null ? null : Number(row.unit_cost);

      return {
        id: row.id,
        inventoryItemId: inventoryItem.id,
        inventoryItemCode: inventoryItem.code,
        inventoryItemName: inventoryItem.name,
        itemType: inventoryItem.itemType,
        unit: inventoryItem.unit,
        quantity,
        unitCost,
        notes: row.notes,
        totalCost: quantity * (unitCost ?? 0),
      };
    })
    .filter((item): item is InventoryReceiptItem => item !== null)
    .sort((a, b) =>
      a.inventoryItemName.localeCompare(b.inventoryItemName, "es", {
        sensitivity: "base",
      }),
    );

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  return {
    id: receipt.id,
    transactionDate: receipt.transaction_date,
    status: receipt.status,
    supplierId: receipt.supplier_id,
    supplierName: getSupplierName(receipt.suppliers),
    referenceType: receipt.reference_type,
    referenceNumber: receipt.reference_number,
    notes: receipt.notes,
    postedAt: receipt.posted_at,
    createdAt: receipt.created_at,
    updatedAt: receipt.updated_at,
    items,
    totalUnits,
    totalCost,
  };
}
