"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getInventoryAdjustmentItems,
  registerInventoryAdjustment,
  type InventoryAdjustmentItem,
  type InventoryAdjustmentKind,
} from "@/lib/inventory/adjustments";

const OPERATION_OPTIONS: Array<{
  value: InventoryAdjustmentKind;
  label: string;
}> = [
  {
    value: "ADJUSTMENT_POSITIVE",
    label: "Ajuste positivo",
  },
  {
    value: "ADJUSTMENT_NEGATIVE",
    label: "Ajuste negativo",
  },
  {
    value: "WASTE",
    label: "Merma",
  },
  {
    value: "INTERNAL_CONSUMPTION",
    label: "Consumo interno",
  },
];

const REASONS: Record<InventoryAdjustmentKind, string[]> = {
  ADJUSTMENT_POSITIVE: [
    "Diferencia de conteo",
    "Ingreso no registrado",
    "Corrección de carga",
    "Devolución de cliente",
    "Otro",
  ],
  ADJUSTMENT_NEGATIVE: [
    "Diferencia de conteo",
    "Salida no registrada",
    "Corrección de carga",
    "Otro",
  ],
  WASTE: ["Daño", "Vencimiento", "Derrame", "Otro"],
  INTERNAL_CONSUMPTION: [
    "Degustación",
    "Control de calidad",
    "Capacitación",
    "Otro",
  ],
};

function formatQuantity(value: number): string {
  return value.toLocaleString("es-CL", {
    maximumFractionDigits: 3,
  });
}

export default function InventoryAdjustmentPanel() {
  const [items, setItems] = useState<InventoryAdjustmentItem[]>([]);

  const [kind, setKind] = useState<InventoryAdjustmentKind>(
    "ADJUSTMENT_POSITIVE",
  );

  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const quantityInputRef = useRef<HTMLInputElement>(null);

  async function loadItems() {
    try {
      setLoading(true);
      setErrorMessage("");

      const loadedItems = await getInventoryAdjustmentItems();

      setItems(loadedItems);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar el inventario.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    setReason("");
    setErrorMessage("");
    setSuccessMessage("");
  }, [kind]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.itemType))).sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-CL");

    return items.filter((item) => {
      const matchesCategory = category === "ALL" || item.itemType === category;

      const matchesQuery =
        !normalizedQuery ||
        item.code.toLocaleLowerCase("es-CL").includes(normalizedQuery) ||
        item.name.toLocaleLowerCase("es-CL").includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, items, query]);

  const selectedItem = useMemo(
    () => items.find((item) => item.inventoryItemId === selectedId) ?? null,
    [items, selectedId],
  );

  function selectItem(item: InventoryAdjustmentItem) {
    setSelectedId(item.inventoryItemId);
    setErrorMessage("");
    setSuccessMessage("");

    window.setTimeout(() => {
      quantityInputRef.current?.focus();
    }, 0);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) {
      setErrorMessage("Selecciona un SKU.");
      return;
    }

    const numericQuantity = Number(quantity.replace(",", "."));

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setErrorMessage("La cantidad debe ser mayor que cero.");
      quantityInputRef.current?.focus();
      return;
    }

    if (!reason) {
      setErrorMessage("Selecciona un motivo.");
      return;
    }

    if (!comment.trim()) {
      setErrorMessage("Ingresa un comentario que explique el movimiento.");
      return;
    }

    const stockDecreases = kind !== "ADJUSTMENT_POSITIVE";

    if (stockDecreases && numericQuantity > selectedItem.stock) {
      setErrorMessage(
        `Stock insuficiente. Disponible: ${formatQuantity(
          selectedItem.stock,
        )} ${selectedItem.unit}.`,
      );
      return;
    }

    const operationLabel =
      OPERATION_OPTIONS.find((option) => option.value === kind)?.label ??
      "Movimiento";

    const confirmed = window.confirm(
      `Registrar ${operationLabel.toLowerCase()} de ${formatQuantity(
        numericQuantity,
      )} ${selectedItem.unit} para ${selectedItem.name}?`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await registerInventoryAdjustment({
        kind,
        inventoryItemId: selectedItem.inventoryItemId,
        quantity: numericQuantity,
        reason,
        comment: comment.trim(),
      });

      await loadItems();

      setQuantity("");
      setReason("");
      setComment("");

      setSuccessMessage(
        `${operationLabel} registrado correctamente. Stock actual: ${formatQuantity(
          result.remainingStock ?? 0,
        )} ${selectedItem.unit}.`,
      );

      window.setTimeout(() => {
        quantityInputRef.current?.focus();
      }, 0);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el movimiento.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.72fr)]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid shrink-0 gap-2 border-b border-neutral-200 p-3 sm:grid-cols-[190px_minmax(0,1fr)_auto]">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="ALL">Todas las categorías</option>

            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por SKU o nombre"
            className="min-h-9 rounded-lg border border-neutral-300 px-3 text-sm"
          />

          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
            className="min-h-9 rounded-lg border border-neutral-200 px-4 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="sticky top-0 z-10 bg-neutral-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-neutral-600">
                  SKU / Nombre
                </th>

                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-neutral-600">
                  Categoría
                </th>

                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-neutral-600">
                  Stock
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    Cargando inventario...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No hay SKU para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const selected = item.inventoryItemId === selectedId;

                  return (
                    <tr
                      key={item.inventoryItemId}
                      onClick={() => selectItem(item)}
                      className={`cursor-pointer ${
                        selected ? "bg-neutral-100" : "hover:bg-neutral-50"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-sm font-semibold text-neutral-950">
                          {item.code}
                        </div>

                        <div className="mt-0.5 text-xs text-neutral-600">
                          {item.name}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-sm text-neutral-600">
                        {item.itemType}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold text-neutral-950">
                        {formatQuantity(item.stock)} {item.unit}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="min-h-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="grid gap-3">
              <div>
                <h2 className="font-semibold text-neutral-950">
                  Registrar movimiento
                </h2>

                <p className="mt-0.5 text-xs text-neutral-500">
                  Selecciona un SKU y completa los datos.
                </p>
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {successMessage}
                </div>
              ) : null}

              <fieldset className="grid grid-cols-2 gap-2">
                {OPERATION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-lg border px-3 py-2.5 transition ${
                      kind === option.value
                        ? "border-neutral-950 bg-neutral-100"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      value={option.value}
                      checked={kind === option.value}
                      onChange={() => setKind(option.value)}
                      className="sr-only"
                    />

                    <div className="text-sm font-semibold text-neutral-950">
                      {option.label}
                    </div>
                  </label>
                ))}
              </fieldset>

              <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
                {selectedItem ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-neutral-950">
                        {selectedItem.name}
                      </div>

                      <div
                        className="mt-0.5 truncate text-xs text-neutral-500"
                        title={selectedItem.code}
                      >
                        {selectedItem.code}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                        Stock
                      </div>

                      <div className="text-sm font-bold text-neutral-950">
                        {formatQuantity(selectedItem.stock)} {selectedItem.unit}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">
                    Ningún SKU seleccionado.
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                <label className="grid gap-1 text-sm font-medium text-neutral-800">
                  Cantidad
                  <input
                    ref={quantityInputRef}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="min-h-10 rounded-lg border border-neutral-300 px-3 font-normal"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-neutral-800">
                  Motivo
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 font-normal"
                  >
                    <option value="">Seleccionar motivo</option>

                    {REASONS[kind].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-sm font-medium text-neutral-800">
                Comentario
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  required
                  rows={2}
                  placeholder="Describe brevemente el origen del movimiento"
                  className="min-h-[68px] resize-none rounded-lg border border-neutral-300 px-3 py-2 font-normal"
                />
              </label>
            </div>
          </div>

          <div className="shrink-0 border-t border-neutral-200 bg-white p-3">
            <button
              type="submit"
              disabled={submitting || !selectedItem}
              className="min-h-11 w-full rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {submitting ? "Registrando..." : "Registrar movimiento"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
