"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getInventoryBatches,
  openInventoryBatch,
  type InventoryBatchItem,
} from "@/lib/inventory/batches";

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

function formatOpenedAt(value: string | null): string {
  if (!value) return "—";
  return timeFormatter.format(new Date(value));
}

export default function BatchOpeningPanel() {
  const [items, setItems] = useState<InventoryBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadItems() {
    try {
      setLoading(true);
      setErrorMessage("");
      setItems(await getInventoryBatches());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar las bachas.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const openItems = useMemo(() => items.filter((item) => item.isOpen), [items]);

  async function handleOpen(item: InventoryBatchItem) {
    const confirmation = item.isOpen
      ? `Ya existe una bacha abierta de ${item.optionValueName}. La apertura actual se cerrará y se descontará una nueva unidad. ¿Continuar?`
      : `Se descontará una bacha de ${item.optionValueName} del stock. ¿Abrirla ahora?`;

    if (!window.confirm(confirmation)) return;

    try {
      setOpeningId(item.inventoryItemId);
      setErrorMessage("");
      setSuccessMessage("");

      await openInventoryBatch(item.inventoryItemId);
      await loadItems();

      setSuccessMessage(`Bacha ${item.optionValueName} abierta correctamente.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible abrir la bacha.",
      );
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
      <section className="min-h-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Bachas disponibles
            </h2>
            <p className="text-xs text-neutral-500">
              Cada apertura descuenta exactamente una unidad.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>

        {errorMessage ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="sticky top-0 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Sabor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  SKU
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    Cargando bachas...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No hay ítems tipo bacha activos.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const canOpen = item.stock >= 1 && openingId === null;

                  return (
                    <tr
                      key={item.inventoryItemId}
                      className="hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-950">
                          {item.optionValueName}
                        </div>
                        {item.isOpen ? (
                          <div className="mt-1 text-xs font-medium text-emerald-700">
                            Abierta desde {formatOpenedAt(item.openedAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {item.code}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-neutral-950">
                        {item.stock.toLocaleString("es-CL", {
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleOpen(item)}
                          disabled={!canOpen}
                          className="min-h-10 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                        >
                          {openingId === item.inventoryItemId
                            ? "Abriendo..."
                            : item.isOpen
                              ? "Reemplazar"
                              : "Abrir"}
                        </button>
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
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="font-semibold text-neutral-950">Bachas abiertas</h2>
          <p className="text-xs text-neutral-500">
            Sabores disponibles para la operación.
          </p>
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-auto p-3">
          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-neutral-500">
              Cargando...
            </p>
          ) : openItems.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-neutral-500">
              No hay bachas abiertas.
            </p>
          ) : (
            <div className="grid gap-2">
              {openItems.map((item) => (
                <div
                  key={item.inventoryItemId}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3"
                >
                  <div className="font-semibold text-neutral-950">
                    {item.optionValueName}
                  </div>
                  <div className="mt-1 text-xs text-emerald-800">
                    Abierta a las {formatOpenedAt(item.openedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
