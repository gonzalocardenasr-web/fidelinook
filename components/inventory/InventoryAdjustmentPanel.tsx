"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getInventoryAdjustmentItems,
  registerInventoryAdjustment,
  type InventoryAdjustmentItem,
  type InventoryAdjustmentKind,
} from "@/lib/inventory/adjustments";

const OPERATION_OPTIONS: Array<{
  value: InventoryAdjustmentKind;
  label: string;
  description: string;
}> = [
  {
    value: "ADJUSTMENT_POSITIVE",
    label: "Ajuste positivo",
    description: "Aumenta el stock para corregir una diferencia.",
  },
  {
    value: "ADJUSTMENT_NEGATIVE",
    label: "Ajuste negativo",
    description: "Disminuye el stock para corregir una diferencia.",
  },
  {
    value: "WASTE",
    label: "Merma",
    description: "Registra una pérdida operativa identificada.",
  },
  {
    value: "INTERNAL_CONSUMPTION",
    label: "Consumo interno",
    description: "Registra degustación, control de calidad u otro uso interno.",
  },
];

const REASONS: Record<InventoryAdjustmentKind, string[]> = {
  ADJUSTMENT_POSITIVE: [
    "Diferencia de conteo",
    "Ingreso no registrado",
    "Corrección de carga",
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
  return value.toLocaleString("es-CL", { maximumFractionDigits: 3 });
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

  async function loadItems() {
    try {
      setLoading(true);
      setErrorMessage("");
      setItems(await getInventoryAdjustmentItems());
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) {
      setErrorMessage("Selecciona un SKU.");
      return;
    }

    const numericQuantity = Number(quantity.replace(",", "."));

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setErrorMessage("La cantidad debe ser mayor que cero.");
      return;
    }

    const stockDecreases = kind !== "ADJUSTMENT_POSITIVE";
    if (stockDecreases && numericQuantity > selectedItem.stock) {
      setErrorMessage(
        `Stock insuficiente. Disponible: ${formatQuantity(selectedItem.stock)} ${selectedItem.unit}.`,
      );
      return;
    }

    const operationLabel =
      OPERATION_OPTIONS.find((option) => option.value === kind)?.label ??
      "movimiento";

    if (
      !window.confirm(
        `Registrar ${operationLabel.toLowerCase()} de ${formatQuantity(numericQuantity)} ${selectedItem.unit} para ${selectedItem.name}?`,
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await registerInventoryAdjustment({
        kind,
        inventoryItemId: selectedItem.inventoryItemId,
        quantity: numericQuantity,
        reason,
        comment,
      });

      await loadItems();
      setQuantity("");
      setComment("");
      setSuccessMessage(
        `${operationLabel} registrado. Stock resultante: ${formatQuantity(result.remainingStock ?? 0)} ${selectedItem.unit}.`,
      );
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
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
      <section className="min-h-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
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
            className="min-h-10 rounded-lg border border-neutral-300 px-3 text-sm"
          />

          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
            className="min-h-10 rounded-lg border border-neutral-200 px-4 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>

        <div className="max-h-[calc(100vh-215px)] overflow-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="sticky top-0 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-600">
                  SKU / Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-600">
                  Categoría
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-neutral-600">
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
                      onClick={() => setSelectedId(item.inventoryItemId)}
                      className={`cursor-pointer ${selected ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-neutral-950">
                          {item.code}
                        </div>
                        <div className="mt-0.5 text-sm text-neutral-600">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {item.itemType}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-950">
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

      <aside className="min-h-0 overflow-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Registrar movimiento
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Selecciona un SKU desde la tabla y completa los datos.
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
                className={`cursor-pointer rounded-lg border p-3 ${kind === option.value ? "border-neutral-950 bg-neutral-50" : "border-neutral-200"}`}
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
                <div className="mt-1 text-xs text-neutral-500">
                  {option.description}
                </div>
              </label>
            ))}
          </fieldset>

          <div className="rounded-lg bg-neutral-50 p-3">
            {selectedItem ? (
              <>
                <div className="text-sm font-semibold text-neutral-950">
                  {selectedItem.name}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  {selectedItem.code} · Stock{" "}
                  {formatQuantity(selectedItem.stock)} {selectedItem.unit}
                </div>
              </>
            ) : (
              <div className="text-sm text-neutral-500">
                Ningún SKU seleccionado.
              </div>
            )}
          </div>

          <label className="grid gap-1 text-sm font-medium text-neutral-800">
            Cantidad
            <input
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

          <label className="grid gap-1 text-sm font-medium text-neutral-800">
            Comentario
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
              rows={3}
              placeholder="Describe brevemente el origen del movimiento"
              className="resize-none rounded-lg border border-neutral-300 px-3 py-2 font-normal"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !selectedItem}
            className="min-h-11 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {submitting ? "Registrando..." : "Registrar movimiento"}
          </button>
        </form>
      </aside>
    </div>
  );
}
