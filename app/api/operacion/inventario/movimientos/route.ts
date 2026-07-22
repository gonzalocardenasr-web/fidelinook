import { NextRequest, NextResponse } from "next/server";

import type {
  InventoryMovement,
  InventoryMovementOption,
} from "@/lib/inventory/movements";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type InventoryItemRelation = {
  id: number;
  code: string;
  name: string;
  item_type: string;
  unit: string;
};

type TransactionTypeRelation = {
  code: string;
  name: string;
  direction: string;
};

type InventoryTransactionRelation = {
  id: number;
  transaction_date: string | null;
  notes: string | null;
  created_by: string | null;
  posted_by: string | null;
  reference_type: string | null;
  reference_id: number | null;
  reference_number: string | null;
  inventory_transaction_types:
    | TransactionTypeRelation
    | TransactionTypeRelation[]
    | null;
};

type TransactionItemRelation = {
  notes: string | null;
};

type InventoryMovementRow = {
  id: number;
  inventory_item_id: number;
  transaction_id: number;
  transaction_item_id: number;
  quantity_before: number | string;
  quantity_change: number | string;
  quantity_after: number | string;
  created_at: string;

  inventory_items: InventoryItemRelation | InventoryItemRelation[] | null;

  inventory_transactions:
    | InventoryTransactionRelation
    | InventoryTransactionRelation[]
    | null;

  inventory_transaction_items:
    | TransactionItemRelation
    | TransactionItemRelation[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getOperator(transaction: InventoryTransactionRelation): string | null {
  /*
   * Priorizamos posted_by porque identifica quién publicó.
   * Si no existe, usamos created_by.
   *
   * Algunos flujos operacionales actuales pueden registrar
   * el rol o referencia del operador en reference_number;
   * por eso queda como último fallback.
   */
  return (
    transaction.posted_by ||
    transaction.created_by ||
    transaction.reference_number ||
    null
  );
}

function toEndOfDay(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function toStartOfDay(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function mapMovement(row: InventoryMovementRow): InventoryMovement | null {
  const item = firstRelation(row.inventory_items);
  const transaction = firstRelation(row.inventory_transactions);
  const transactionItem = firstRelation(row.inventory_transaction_items);

  if (!item || !transaction) {
    return null;
  }

  const transactionType = firstRelation(
    transaction.inventory_transaction_types,
  );

  return {
    id: Number(row.id),
    createdAt: row.created_at,

    inventoryItemId: Number(row.inventory_item_id),
    itemCode: item.code,
    itemName: item.name,
    itemType: item.item_type,
    unit: item.unit,

    transactionId: Number(row.transaction_id),
    transactionTypeCode: transactionType?.code ?? "UNKNOWN",
    transactionTypeName:
      transactionType?.name ?? "Movimiento sin clasificación",

    quantityBefore: Number(row.quantity_before),
    quantityChange: Number(row.quantity_change),
    quantityAfter: Number(row.quantity_after),

    transactionDate: transaction.transaction_date,
    referenceType: transaction.reference_type,
    referenceId:
      transaction.reference_id === null
        ? null
        : Number(transaction.reference_id),
    referenceNumber: transaction.reference_number,

    operator: getOperator(transaction),
    transactionNotes: transaction.notes,
    itemNotes: transactionItem?.notes ?? null,
  };
}

function buildOptions(
  values: Array<{ value: string; label: string }>,
): InventoryMovementOption[] {
  const unique = new Map<string, string>();

  for (const option of values) {
    if (!option.value) continue;
    unique.set(option.value, option.label);
  }

  return Array.from(unique.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function GET(request: NextRequest) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const params = request.nextUrl.searchParams;

    const dateFrom = params.get("dateFrom")?.trim() ?? "";
    const dateTo = params.get("dateTo")?.trim() ?? "";
    const itemSearch = normalizeText(params.get("itemSearch"));
    const movementType = params.get("movementType")?.trim() ?? "";
    const operatorFilter = normalizeText(params.get("operator"));
    const referenceFilter = normalizeText(params.get("reference"));

    let query = supabaseAdmin
      .from("inventory_movements")
      .select(
        `
          id,
          inventory_item_id,
          transaction_id,
          transaction_item_id,
          quantity_before,
          quantity_change,
          quantity_after,
          created_at,

          inventory_items!inner (
            id,
            code,
            name,
            item_type,
            unit
          ),

          inventory_transactions!inner (
            id,
            transaction_date,
            notes,
            created_by,
            posted_by,
            reference_type,
            reference_id,
            reference_number,

            inventory_transaction_types!inner (
              code,
              name,
              direction
            )
          ),

          inventory_transaction_items!inner (
            notes
          )
        `,
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (dateFrom) {
      query = query.gte("created_at", toStartOfDay(dateFrom));
    }

    if (dateTo) {
      query = query.lte("created_at", toEndOfDay(dateTo));
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `No fue posible consultar el historial: ${error.message}`,
      );
    }

    const allMovements = ((data ?? []) as InventoryMovementRow[])
      .map(mapMovement)
      .filter((movement): movement is InventoryMovement => movement !== null);

    /*
     * Creamos las opciones antes de aplicar filtros de tipo
     * y operador para que los dropdowns no desaparezcan al
     * seleccionar una opción.
     */
    const movementTypes = buildOptions(
      allMovements.map((movement) => ({
        value: movement.transactionTypeCode,
        label: movement.transactionTypeName,
      })),
    );

    const operators = buildOptions(
      allMovements
        .filter((movement) => Boolean(movement.operator))
        .map((movement) => ({
          value: movement.operator ?? "",
          label: movement.operator ?? "",
        })),
    );

    const filteredMovements = allMovements
      .filter((movement) => {
        if (!itemSearch) return true;

        return (
          normalizeText(movement.itemCode).includes(itemSearch) ||
          normalizeText(movement.itemName).includes(itemSearch)
        );
      })
      .filter((movement) => {
        if (!movementType) return true;

        return movement.transactionTypeCode === movementType;
      })
      .filter((movement) => {
        if (!operatorFilter) return true;

        return normalizeText(movement.operator).includes(operatorFilter);
      })
      .filter((movement) => {
        if (!referenceFilter) return true;

        const searchableReference = [
          movement.referenceType,
          movement.referenceId,
          movement.referenceNumber,
          movement.transactionId,
          movement.transactionNotes,
          movement.itemNotes,
        ]
          .map(normalizeText)
          .join(" ");

        return searchableReference.includes(referenceFilter);
      })
      .slice(0, 100);

    return NextResponse.json({
      ok: true,
      movements: filteredMovements,
      movementTypes,
      operators,
    });
  } catch (error) {
    console.error("Error cargando historial de inventario:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el historial.",
      },
      { status: 500 },
    );
  }
}
