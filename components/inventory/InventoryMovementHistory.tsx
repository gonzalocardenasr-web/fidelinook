"use client";

import { useEffect, useState } from "react";

import {
  getInventoryMovements,
  InventoryMovement,
  InventoryMovementFilters,
  InventoryMovementOption,
} from "@/lib/inventory/movements";

const INITIAL_FILTERS: InventoryMovementFilters = {
  dateFrom: "",
  dateTo: "",
  itemSearch: "",
  movementType: "",
  operator: "",
  reference: "",
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 3,
  }).format(value);
}

function getMovementColor(quantityChange: number): string {
  if (quantityChange > 0) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (quantityChange < 0) {
    return "bg-red-50 text-red-700";
  }

  return "bg-neutral-100 text-neutral-700";
}

function shortenOperator(value: string | null): string {
  if (!value) return "Sin registro";

  /*
   * Un rol como admin/superadmin se muestra completo.
   * Un UUID se abrevia para no ocupar toda la tabla.
   */
  if (!value.includes("-") || value.length < 20) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export default function InventoryMovementHistory() {
  const [filters, setFilters] =
    useState<InventoryMovementFilters>(INITIAL_FILTERS);

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementTypes, setMovementTypes] = useState<InventoryMovementOption[]>(
    [],
  );
  const [operators, setOperators] = useState<InventoryMovementOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadMovements(
    appliedFilters: InventoryMovementFilters = filters,
  ) {
    try {
      setLoading(true);
      setMessage("");

      const response = await getInventoryMovements(appliedFilters);

      setMovements(response.movements ?? []);
      setMovementTypes(response.movementTypes ?? []);
      setOperators(response.operators ?? []);
    } catch (error) {
      console.error("Error cargando movimientos:", error);

      setMovements([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMovements(INITIAL_FILTERS);
    // La primera carga debe ejecutarse una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter<K extends keyof InventoryMovementFilters>(
    key: K,
    value: InventoryMovementFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    void loadMovements(INITIAL_FILTERS);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label
              htmlFor="movement-date-from"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Desde
            </label>

            <input
              id="movement-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="movement-date-to"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Hasta
            </label>

            <input
              id="movement-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="movement-item"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Ítem
            </label>

            <input
              id="movement-item"
              type="search"
              value={filters.itemSearch}
              onChange={(event) =>
                updateFilter("itemSearch", event.target.value)
              }
              placeholder="SKU o nombre"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="movement-type"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Tipo
            </label>

            <select
              id="movement-type"
              value={filters.movementType}
              onChange={(event) =>
                updateFilter("movementType", event.target.value)
              }
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            >
              <option value="">Todos</option>

              {movementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="movement-operator"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Usuario
            </label>

            <select
              id="movement-operator"
              value={filters.operator}
              onChange={(event) => updateFilter("operator", event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            >
              <option value="">Todos</option>

              {operators.map((operator) => (
                <option key={operator.value} value={operator.value}>
                  {shortenOperator(operator.label)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="movement-reference"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Referencia
            </label>

            <input
              id="movement-reference"
              type="search"
              value={filters.reference}
              onChange={(event) =>
                updateFilter("reference", event.target.value)
              }
              placeholder="Venta, recepción, ID..."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            {loading
              ? "Cargando movimientos..."
              : `${movements.length} movimiento${
                  movements.length === 1 ? "" : "s"
                } encontrado${movements.length === 1 ? "" : "s"}.`}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={() => void loadMovements()}
              disabled={loading}
              className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Aplicar filtros"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}
      </div>

      <div className="max-h-[590px] overflow-auto">
        <table className="min-w-[1320px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-neutral-50">
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-600">
              <th className="border-b border-neutral-200 px-4 py-3">Fecha</th>
              <th className="border-b border-neutral-200 px-4 py-3">
                SKU / Producto
              </th>
              <th className="border-b border-neutral-200 px-4 py-3">Tipo</th>
              <th className="border-b border-neutral-200 px-4 py-3 text-right">
                Antes
              </th>
              <th className="border-b border-neutral-200 px-4 py-3 text-right">
                Movimiento
              </th>
              <th className="border-b border-neutral-200 px-4 py-3 text-right">
                Después
              </th>
              <th className="border-b border-neutral-200 px-4 py-3">Usuario</th>
              <th className="border-b border-neutral-200 px-4 py-3">
                Referencia
              </th>
              <th className="border-b border-neutral-200 px-4 py-3">
                Comentario
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading && movements.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-neutral-500"
                >
                  No existen movimientos para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              movements.map((movement) => {
                const comment =
                  movement.itemNotes || movement.transactionNotes || "—";

                const reference =
                  movement.referenceNumber ||
                  (movement.referenceId
                    ? String(movement.referenceId)
                    : `TX-${movement.transactionId}`);

                return (
                  <tr
                    key={movement.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                      {formatDate(
                        movement.transactionDate || movement.createdAt,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-950">
                        {movement.itemCode}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {movement.itemName} · {movement.unit}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">
                        {movement.transactionTypeName}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {movement.transactionTypeCode}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                      {formatQuantity(movement.quantityBefore)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex min-w-[70px] justify-end rounded-md px-2 py-1 font-semibold tabular-nums ${getMovementColor(
                          movement.quantityChange,
                        )}`}
                      >
                        {movement.quantityChange > 0 ? "+" : ""}
                        {formatQuantity(movement.quantityChange)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-950">
                      {formatQuantity(movement.quantityAfter)}
                    </td>

                    <td
                      className="px-4 py-3 text-neutral-700"
                      title={movement.operator ?? undefined}
                    >
                      {shortenOperator(movement.operator)}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">
                        {reference}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {movement.referenceType || "Sin tipo"}
                      </p>
                    </td>

                    <td
                      className="max-w-[300px] px-4 py-3 text-neutral-700"
                      title={comment}
                    >
                      <p className="line-clamp-2">{comment}</p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
