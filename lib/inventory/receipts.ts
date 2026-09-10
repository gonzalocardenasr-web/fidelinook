import "server-only";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type InventoryReceiptListItem = {
  id: number;
  transactionDate: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  referenceType: string | null;
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
  reference_type: string | null;
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
  const session = await getOperationSession();

  if (!session.ok) {
    throw new Error("Tu sesión no se encuentra activa.");
  }

  if (!session.userId) {
    throw new Error(
      "Tu sesión debe renovarse para identificar al usuario. Cierra sesión e inicia sesión nuevamente.",
    );
  }

  const { data: operationalUser, error: operationalUserError } =
    await supabaseAdmin
      .from("operational_users")
      .select("id, role, is_active")
      .eq("id", session.userId)
      .maybeSingle();

  if (operationalUserError) {
    console.error(
      "Error validando usuario operacional para listado de recepciones:",
      operationalUserError,
    );

    throw new Error("No fue posible validar al usuario operacional.");
  }

  if (!operationalUser || !operationalUser.is_active) {
    throw new Error("El usuario operacional no se encuentra activo.");
  }

  if (operationalUser.role !== session.role) {
    console.error(
      "Rol inconsistente listando recepciones:",
      session.userId,
      session.role,
      operationalUser.role,
    );

    throw new Error("La sesión operacional no es válida.");
  }

  const { data, error } = await supabaseAdmin
    .from("inventory_transactions")
    .select(
      `
      id,
      transaction_date,
      status,
      reference_number,
      reference_type,
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
      referenceType: receipt.reference_type,
      supplierName: getSupplierName(receipt.suppliers),
      itemCount: items.length,
      totalUnits,
      totalCost,
      createdAt: receipt.created_at,
    };
  });
}
