"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  getInventoryReceiptById,
  type InventoryReceiptDetail,
  type InventoryReceiptItem,
  type InventoryReceiptStatus,
} from "@/lib/inventory/receipt";
import {
  getActiveInventoryItems,
  type ActiveInventoryItem,
} from "@/lib/inventory/items";
import { saveInventoryReceiptItem } from "@/lib/inventory/receiptItems";

type ReceiptItemForm = {
  inventoryItemCode: string;
  quantity: string;
  unitCost: string;
  notes: string;
};

const initialItemForm: ReceiptItemForm = {
  inventoryItemCode: "",
  quantity: "1",
  unitCost: "",
  notes: "",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 3,
  }).format(value);
}

function getStatusLabel(status: InventoryReceiptStatus): string {
  const labels: Record<InventoryReceiptStatus, string> = {
    DRAFT: "Borrador",
    POSTED: "Publicada",
    CANCELLED: "Cancelada",
  };

  return labels[status];
}

function getStatusClasses(status: InventoryReceiptStatus): string {
  const classes: Record<InventoryReceiptStatus, string> = {
    DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
    POSTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };

  return classes[status];
}

function getItemTypeLabel(itemType: string): string {
  const labels: Record<string, string> = {
    BATCH: "Bachas",
    PREPARED_PRODUCT: "Potes preparados",
    RESALE_PRODUCT: "Productos de reventa",
  };

  return labels[itemType] ?? itemType;
}

export default function InventoryReceiptDetailPage() {
  const params = useParams<{ transactionId: string }>();
  const transactionId = Number(params.transactionId);

  const [receipt, setReceipt] = useState<InventoryReceiptDetail | null>(null);
  const [inventoryItems, setInventoryItems] = useState<ActiveInventoryItem[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [loadingInventoryItems, setLoadingInventoryItems] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryReceiptItem | null>(
    null,
  );
  const [itemForm, setItemForm] = useState<ReceiptItemForm>(initialItemForm);
  const [itemErrorMessage, setItemErrorMessage] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  const loadReceipt = useCallback(async () => {
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      throw new Error("El identificador de la recepción no es válido.");
    }

    const receiptDetail = await getInventoryReceiptById(transactionId);

    setReceipt(receiptDetail);
  }, [transactionId]);

  useEffect(() => {
    async function initializePage() {
      try {
        setLoading(true);
        setErrorMessage("");

        await loadReceipt();
      } catch (error) {
        setReceipt(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar la recepción.",
        );
      } finally {
        setLoading(false);
      }
    }

    void initializePage();
  }, [loadReceipt]);

  const groupedInventoryItems = useMemo(() => {
    const groups = new Map<string, ActiveInventoryItem[]>();

    inventoryItems.forEach((item) => {
      const currentItems = groups.get(item.itemType) ?? [];

      currentItems.push(item);
      groups.set(item.itemType, currentItems);
    });

    return Array.from(groups.entries());
  }, [inventoryItems]);

  const selectedInventoryItem = useMemo(
    () =>
      inventoryItems.find((item) => item.code === itemForm.inventoryItemCode) ??
      null,
    [inventoryItems, itemForm.inventoryItemCode],
  );

  async function ensureInventoryItemsLoaded() {
    if (inventoryItems.length > 0) {
      return;
    }

    try {
      setLoadingInventoryItems(true);

      const activeItems = await getActiveInventoryItems();

      setInventoryItems(activeItems);
    } finally {
      setLoadingInventoryItems(false);
    }
  }

  async function openNewItemForm() {
    if (!receipt || receipt.status !== "DRAFT") {
      return;
    }

    setEditingItem(null);
    setItemForm(initialItemForm);
    setItemErrorMessage("");
    setShowItemForm(true);

    try {
      await ensureInventoryItemsLoaded();
    } catch (error) {
      setItemErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar los productos.",
      );
    }
  }

  async function openEditItemForm(item: InventoryReceiptItem) {
    if (!receipt || receipt.status !== "DRAFT") {
      return;
    }

    setEditingItem(item);
    setItemForm({
      inventoryItemCode: item.inventoryItemCode,
      quantity: String(item.quantity),
      unitCost: item.unitCost === null ? "" : String(item.unitCost),
      notes: item.notes ?? "",
    });
    setItemErrorMessage("");
    setShowItemForm(true);

    try {
      await ensureInventoryItemsLoaded();
    } catch (error) {
      setItemErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar los productos.",
      );
    }
  }

  function closeItemForm() {
    if (savingItem) {
      return;
    }

    setShowItemForm(false);
    setEditingItem(null);
    setItemForm(initialItemForm);
    setItemErrorMessage("");
  }

  async function handleSaveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!receipt || receipt.status !== "DRAFT") {
      setItemErrorMessage("Solo pueden modificarse recepciones en borrador.");
      return;
    }

    if (!itemForm.inventoryItemCode) {
      setItemErrorMessage("Debes seleccionar un producto.");
      return;
    }

    const quantity = Number(itemForm.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItemErrorMessage("La cantidad debe ser un número mayor que cero.");
      return;
    }

    const unitCost =
      itemForm.unitCost.trim() === "" ? null : Number(itemForm.unitCost);

    if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      setItemErrorMessage(
        "El costo unitario debe ser cero o un número positivo.",
      );
      return;
    }

    try {
      setSavingItem(true);
      setItemErrorMessage("");

      await saveInventoryReceiptItem({
        transactionId: receipt.id,
        inventoryItemCode: itemForm.inventoryItemCode,
        quantity,
        unitCost,
        notes: itemForm.notes,
      });

      await loadReceipt();

      setShowItemForm(false);
      setEditingItem(null);
      setItemForm(initialItemForm);
    } catch (error) {
      setItemErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar el producto.",
      );
    } finally {
      setSavingItem(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6F3FF] px-4 py-3">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-neutral-600">
              Cargando recepción...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !receipt) {
    return (
      <main className="min-h-screen bg-[#F6F3FF] px-4 py-3">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <Link
            href="/operacion/inventario/recepciones"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Volver a Recepciones
          </Link>

          <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
            <h1 className="text-lg font-semibold text-neutral-950">
              No fue posible cargar la recepción
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {errorMessage ||
                "La recepción indicada no se encuentra disponible."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const isDraft = receipt.status === "DRAFT";

  return (
    <main className="min-h-screen bg-[#F6F3FF] px-4 py-3">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/operacion/inventario/recepciones"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              ← Volver a Recepciones
            </Link>

            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-xl font-semibold text-neutral-950">
                Recepción #{receipt.id}
              </h1>

              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(
                  receipt.status,
                )}`}
              >
                {getStatusLabel(receipt.status)}
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            Detalle del ingreso de inventario
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-950">
            Información de la recepción
          </h2>

          <dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Proveedor
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-neutral-900">
                {receipt.supplierName ?? "Sin proveedor"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Fecha de recepción
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-neutral-900">
                {formatDateTime(receipt.transactionDate)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tipo de movimiento
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-neutral-900">
                Compra
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Número de documento
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-neutral-900">
                {receipt.referenceNumber || "Sin número"}
              </dd>
            </div>

            <div className="border-t border-neutral-100 pt-2 sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Observaciones
              </dt>
              <dd className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-neutral-700">
                {receipt.notes || "Sin observaciones"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                Productos recibidos
              </h2>

              <p className="mt-0.5 text-xs text-neutral-500">
                {receipt.items.length === 1
                  ? "1 producto registrado"
                  : `${receipt.items.length} productos registrados`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void openNewItemForm()}
              disabled={!isDraft}
              title={
                isDraft
                  ? "Agregar producto a la recepción."
                  : "Una recepción publicada no puede modificarse."
              }
              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar producto
            </button>
          </div>

          {receipt.items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold text-neutral-700">
                Esta recepción todavía no tiene productos.
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Agrega las bachas, potes o productos recibidos.
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="sticky top-0 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Producto
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Costo unitario
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Costo total
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 bg-white">
                  {receipt.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-semibold text-neutral-900">
                          {item.inventoryItemName}
                        </p>

                        <p className="mt-0.5 text-xs text-neutral-500">
                          {item.inventoryItemCode} ·{" "}
                          {getItemTypeLabel(item.itemType)}
                        </p>
                      </td>

                      <td className="px-4 py-2.5 text-right text-sm font-medium text-neutral-900">
                        {formatQuantity(item.quantity)} {item.unit}
                      </td>

                      <td className="px-4 py-2.5 text-right text-sm text-neutral-700">
                        {item.unitCost === null
                          ? "Sin costo"
                          : formatCurrency(item.unitCost)}
                      </td>

                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-neutral-900">
                        {formatCurrency(item.totalCost)}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => void openEditItemForm(item)}
                          disabled={!isDraft}
                          className="text-sm font-semibold text-violet-600 hover:text-violet-800 disabled:cursor-not-allowed disabled:text-neutral-400"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-3 border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Líneas
              </p>
              <p className="mt-0.5 text-base font-bold text-neutral-950">
                {receipt.items.length}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Unidades totales
              </p>
              <p className="mt-0.5 text-base font-bold text-neutral-950">
                {formatQuantity(receipt.totalUnits)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Costo total
              </p>
              <p className="mt-0.5 text-base font-bold text-neutral-950">
                {formatCurrency(receipt.totalCost)}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap justify-between gap-2">
          <Link
            href="/operacion/inventario/recepciones"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Volver al listado
          </Link>

          <button
            type="button"
            disabled
            title={
              isDraft
                ? "Se habilitará después del desarrollo de publicación."
                : "La recepción ya no se encuentra en borrador."
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Publicar recepción
          </button>
        </section>
      </div>

      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-item-form-title"
            className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="receipt-item-form-title"
                  className="text-lg font-semibold text-neutral-950"
                >
                  {editingItem ? "Editar producto" : "Agregar producto"}
                </h2>

                <p className="mt-0.5 text-xs text-neutral-500">
                  Recepción #{receipt.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeItemForm}
                disabled={savingItem}
                aria-label="Cerrar"
                className="rounded-lg px-2 py-1 text-lg font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="inventoryItemCode"
                    className="mb-1 block text-xs font-semibold text-neutral-700"
                  >
                    Producto
                  </label>

                  <select
                    id="inventoryItemCode"
                    value={itemForm.inventoryItemCode}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        inventoryItemCode: event.target.value,
                      }))
                    }
                    disabled={
                      savingItem ||
                      loadingInventoryItems ||
                      editingItem !== null
                    }
                    required
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-neutral-100"
                  >
                    <option value="">
                      {loadingInventoryItems
                        ? "Cargando productos..."
                        : "Selecciona un producto"}
                    </option>

                    {groupedInventoryItems.map(([itemType, items]) => (
                      <optgroup
                        key={itemType}
                        label={getItemTypeLabel(itemType)}
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.code}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-1 block text-xs font-semibold text-neutral-700"
                  >
                    Cantidad
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={itemForm.quantity}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    disabled={savingItem}
                    required
                    className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />

                  {selectedInventoryItem && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Unidad: {selectedInventoryItem.unit}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="unitCost"
                    className="mb-1 block text-xs font-semibold text-neutral-700"
                  >
                    Costo unitario
                  </label>

                  <input
                    id="unitCost"
                    type="number"
                    min="0"
                    step="1"
                    value={itemForm.unitCost}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        unitCost: event.target.value,
                      }))
                    }
                    disabled={savingItem}
                    placeholder="Opcional"
                    className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="itemNotes"
                    className="mb-1 block text-xs font-semibold text-neutral-700"
                  >
                    Observación de la línea
                  </label>

                  <textarea
                    id="itemNotes"
                    rows={2}
                    maxLength={1000}
                    value={itemForm.notes}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    disabled={savingItem}
                    placeholder="Opcional"
                    className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              {itemErrorMessage && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {itemErrorMessage}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeItemForm}
                  disabled={savingItem}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    savingItem ||
                    loadingInventoryItems ||
                    inventoryItems.length === 0
                  }
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingItem
                    ? "Guardando..."
                    : editingItem
                      ? "Guardar cambios"
                      : "Agregar producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
