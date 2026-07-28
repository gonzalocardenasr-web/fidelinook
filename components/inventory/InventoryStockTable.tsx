"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getInventoryStock,
  type InventoryStockItem,
} from "@/lib/inventory/stock";

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatCategory(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatVariation(value: number): string {
  if (value > 0) {
    return `+${formatQuantity(value)}`;
  }

  return formatQuantity(value);
}

function formatLastMovement(value: string | null): string {
  if (!value) {
    return "Sin movimientos";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function InventoryStockTable() {
  const [items, setItems] = useState<InventoryStockItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStock = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await getInventoryStock();
      setItems(response.items ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar el stock.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.category).filter(Boolean)),
    ).sort((a, b) => formatCategory(a).localeCompare(formatCategory(b), "es"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return items.filter((item) => {
      if (category && item.category !== category) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        normalizeText(item.sku).includes(normalizedSearch) ||
        normalizeText(item.productName).includes(normalizedSearch) ||
        normalizeText(item.category).includes(normalizedSearch)
      );
    });
  }, [items, search, category]);

  if (loading) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-600">
          Cargando stock operacional...
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Buscar
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por SKU o producto"
                className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Categoría
              </span>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500"
              >
                <option value="">Todas las categorías</option>

                {categories.map((option) => (
                  <option key={option} value={option}>
                    {formatCategory(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void loadStock(true)}
            disabled={refreshing}
            className="h-10 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar stock"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-600">
          <span>
            SKU mostrados:{" "}
            <strong className="font-semibold text-neutral-950">
              {filteredItems.length}
            </strong>
          </span>

          <span>
            Última consulta:{" "}
            <strong className="font-semibold text-neutral-950">
              {new Intl.DateTimeFormat("es-CL", {
                timeZone: "America/Santiago",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date())}
            </strong>
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>

          <button
            type="button"
            onClick={() => void loadStock()}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left">
            <thead className="bg-neutral-50">
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Categoría
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  SKU
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Producto
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Stock inicial
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Variación del día
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Stock actual
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Último movimiento
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.inventoryItemId}
                  className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-700">
                    {formatCategory(item.category)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-neutral-700">
                    {item.sku}
                  </td>

                  <td className="px-4 py-3 text-sm font-medium text-neutral-950">
                    {item.productName}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-neutral-700">
                    {formatQuantity(item.openingStock)}
                  </td>

                  <td
                    className={[
                      "whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums",
                      item.dayVariation < 0
                        ? "text-red-700"
                        : item.dayVariation > 0
                          ? "text-emerald-700"
                          : "text-neutral-500",
                    ].join(" ")}
                  >
                    {formatVariation(item.dayVariation)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-neutral-950">
                    {formatQuantity(item.currentStock)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                    {formatLastMovement(item.lastMovementAt)}
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No existen productos que coincidan con los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        La variación corresponde al movimiento neto registrado durante el día
        operacional. Las cantidades se expresan en unidades.
      </p>
    </section>
  );
}
