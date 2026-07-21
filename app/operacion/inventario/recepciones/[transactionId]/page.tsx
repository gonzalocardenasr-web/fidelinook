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
import { postInventoryReceipt } from "@/lib/inventory/postReceipt";
import { deleteInventoryReceiptItem } from "@/lib/inventory/deleteReceiptItem";

type ReceiptItemForm = {
  inventoryItemCode: string;
  quantity: string;
  unitCost: string;
  costIncludesVat: boolean;
  notes: string;
};

const initialItemForm: ReceiptItemForm = {
  inventoryItemCode: "",
  quantity: "1",
  unitCost: "",
  costIncludesVat: false,
  notes: "",
};

const VAT_RATE = 0.19;

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

  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [postingReceipt, setPostingReceipt] = useState(false);
  const [postErrorMessage, setPostErrorMessage] = useState("");
  const [postSuccessMessage, setPostSuccessMessage] = useState("");

  const [itemPendingDeletion, setItemPendingDeletion] =
    useState<InventoryReceiptItem | null>(null);

  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteItemErrorMessage, setDeleteItemErrorMessage] = useState("");

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
      costIncludesVat: true,
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

    if (!Number.isInteger(quantity) || quantity < 1) {
      setItemErrorMessage(
        "La cantidad debe ser un número entero igual o mayor que 1.",
      );
      return;
    }

    const enteredUnitCost =
      itemForm.unitCost.trim() === "" ? null : Number(itemForm.unitCost);

    if (
      enteredUnitCost !== null &&
      (!Number.isFinite(enteredUnitCost) || enteredUnitCost < 0)
    ) {
      setItemErrorMessage(
        "El costo unitario debe ser cero o un número positivo.",
      );
      return;
    }

    const unitCostWithVat =
      enteredUnitCost === null
        ? null
        : itemForm.costIncludesVat
          ? Math.round(enteredUnitCost)
          : Math.round(enteredUnitCost * (1 + VAT_RATE));

    try {
      setSavingItem(true);
      setItemErrorMessage("");

      await saveInventoryReceiptItem({
        transactionId: receipt.id,
        inventoryItemCode: itemForm.inventoryItemCode,
        quantity,
        unitCost: unitCostWithVat,
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

  function openPostConfirmation() {
    if (!receipt) {
      return;
    }

    if (receipt.status !== "DRAFT") {
      setPostErrorMessage("Solo pueden publicarse recepciones en borrador.");
      return;
    }

    if (receipt.items.length === 0) {
      setPostErrorMessage(
        "Debes agregar al menos un producto antes de publicar la recepción.",
      );
      return;
    }

    setPostErrorMessage("");
    setPostSuccessMessage("");
    setShowPostConfirmation(true);
  }

  function closePostConfirmation() {
    if (postingReceipt) {
      return;
    }

    setShowPostConfirmation(false);
    setPostErrorMessage("");
  }

  async function handlePostReceipt() {
    if (!receipt) {
      return;
    }

    if (receipt.status !== "DRAFT") {
      setPostErrorMessage("La recepción ya no se encuentra en borrador.");
      return;
    }

    if (receipt.items.length === 0) {
      setPostErrorMessage("La recepción debe contener al menos un producto.");
      return;
    }

    try {
      setPostingReceipt(true);
      setPostErrorMessage("");
      setPostSuccessMessage("");

      await postInventoryReceipt(receipt.id);
      await loadReceipt();

      setShowPostConfirmation(false);
      setPostSuccessMessage(
        "Recepción publicada correctamente. El inventario fue actualizado.",
      );
    } catch (error) {
      setPostErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al publicar la recepción.",
      );
    } finally {
      setPostingReceipt(false);
    }
  }

  function openDeleteItemConfirmation(item: InventoryReceiptItem) {
    if (!receipt || receipt.status !== "DRAFT") {
      setDeleteItemErrorMessage(
        "Solo pueden eliminarse productos de una recepción en borrador.",
      );
      return;
    }

    setDeleteItemErrorMessage("");
    setItemPendingDeletion(item);
  }

  function closeDeleteItemConfirmation() {
    if (deletingItem) {
      return;
    }

    setItemPendingDeletion(null);
    setDeleteItemErrorMessage("");
  }

  async function handleDeleteItem() {
    if (!itemPendingDeletion) {
      return;
    }

    try {
      setDeletingItem(true);
      setDeleteItemErrorMessage("");

      await deleteInventoryReceiptItem(itemPendingDeletion.id);

      await loadReceipt();

      setItemPendingDeletion(null);
    } catch (error) {
      setDeleteItemErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al eliminar el producto.",
      );
    } finally {
      setDeletingItem(false);
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

        {postSuccessMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {postSuccessMessage}
          </div>
        )}

        {postErrorMessage && !showPostConfirmation && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {postErrorMessage}
          </div>
        )}

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
                      Costo unitario c/IVA
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Costo total c/IVA
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
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {isDraft ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditItemForm(item)}
                                disabled={savingItem || deletingItem}
                                className="text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => openDeleteItemConfirmation(item)}
                                disabled={savingItem || deletingItem}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">
                              Sin acciones
                            </span>
                          )}
                        </td>
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
                Costo total IVA incluido
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

          {isDraft ? (
            <button
              type="button"
              onClick={openPostConfirmation}
              disabled={postingReceipt || receipt.items.length === 0}
              title={
                receipt.items.length === 0
                  ? "Agrega al menos un producto antes de publicar."
                  : "Publicar y actualizar el inventario."
              }
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publicar recepción
            </button>
          ) : (
            <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              Recepción publicada
            </div>
          )}
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
                    min="1"
                    step="1"
                    inputMode="numeric"
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

                  <div className="grid grid-cols-[1fr_auto] gap-2">
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
                      className="h-10 min-w-0 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />

                    <select
                      aria-label="Tratamiento del IVA"
                      value={
                        itemForm.costIncludesVat ? "WITH_VAT" : "WITHOUT_VAT"
                      }
                      onChange={(event) =>
                        setItemForm((current) => ({
                          ...current,
                          costIncludesVat: event.target.value === "WITH_VAT",
                        }))
                      }
                      disabled={savingItem}
                      className="h-10 rounded-xl border border-neutral-200 bg-white px-2 text-xs font-semibold text-neutral-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="WITHOUT_VAT">Sin IVA</option>
                      <option value="WITH_VAT">Con IVA</option>
                    </select>
                  </div>

                  {itemForm.unitCost.trim() !== "" &&
                    Number.isFinite(Number(itemForm.unitCost)) &&
                    Number(itemForm.unitCost) >= 0 && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Costo final IVA incluido:{" "}
                        <span className="font-semibold text-neutral-700">
                          {formatCurrency(
                            itemForm.costIncludesVat
                              ? Math.round(Number(itemForm.unitCost))
                              : Math.round(
                                  Number(itemForm.unitCost) * (1 + VAT_RATE),
                                ),
                          )}
                        </span>
                      </p>
                    )}
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

      {showPostConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-receipt-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <div>
              <h2
                id="post-receipt-title"
                className="text-lg font-semibold text-neutral-950"
              >
                Publicar recepción
              </h2>

              <p className="mt-2 text-sm text-neutral-600">
                Estás a punto de publicar la recepción{" "}
                <span className="font-semibold text-neutral-900">
                  #{receipt.id}
                </span>
                .
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-sm font-semibold text-amber-800">
                Esta acción es definitiva
              </p>

              <ul className="mt-2 space-y-1 text-xs text-amber-700">
                <li>• Se actualizará el stock disponible.</li>
                <li>• Se generarán los movimientos de inventario.</li>
                <li>• La recepción ya no podrá modificarse.</li>
              </ul>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-neutral-50 px-3 py-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Líneas
                </dt>
                <dd className="mt-1 text-sm font-bold text-neutral-950">
                  {receipt.items.length}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Unidades
                </dt>
                <dd className="mt-1 text-sm font-bold text-neutral-950">
                  {formatQuantity(receipt.totalUnits)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Total c/IVA
                </dt>
                <dd className="mt-1 text-sm font-bold text-neutral-950">
                  {formatCurrency(receipt.totalCost)}
                </dd>
              </div>
            </dl>

            {postErrorMessage && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {postErrorMessage}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePostConfirmation}
                disabled={postingReceipt}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handlePostReceipt()}
                disabled={postingReceipt}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {postingReceipt ? "Publicando..." : "Confirmar publicación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {itemPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-receipt-item-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <h2
              id="delete-receipt-item-title"
              className="text-lg font-semibold text-neutral-950"
            >
              Eliminar producto
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Se eliminará{" "}
              <span className="font-semibold text-neutral-900">
                {itemPendingDeletion.inventoryItemName}
              </span>{" "}
              de esta recepción.
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              Los totales se recalcularán automáticamente.
            </p>

            {deleteItemErrorMessage && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {deleteItemErrorMessage}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteItemConfirmation}
                disabled={deletingItem}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteItem()}
                disabled={deletingItem}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingItem ? "Eliminando..." : "Eliminar producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
