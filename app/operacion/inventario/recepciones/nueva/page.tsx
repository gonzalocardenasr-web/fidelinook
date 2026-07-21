"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  createInventoryReceipt,
  type CreateInventoryReceiptInput,
} from "@/lib/inventory/createReceipt";
import {
  getActiveInventorySuppliers,
  type InventorySupplier,
} from "@/lib/inventory/suppliers";

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

const initialForm: CreateInventoryReceiptInput = {
  supplierId: 0,
  referenceType: "PURCHASE",
  referenceNumber: "",
  transactionDate: getCurrentLocalDateTime(),
  notes: "",
};

export default function NewInventoryReceiptPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [form, setForm] = useState<CreateInventoryReceiptInput>(initialForm);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSuppliers() {
      try {
        setLoadingSuppliers(true);
        setErrorMessage("");

        const activeSuppliers = await getActiveInventorySuppliers();

        setSuppliers(activeSuppliers);

        if (activeSuppliers.length > 0) {
          setForm((current) => ({
            ...current,
            supplierId: activeSuppliers[0].id,
          }));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar los proveedores.",
        );
      } finally {
        setLoadingSuppliers(false);
      }
    }

    void loadSuppliers();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.supplierId) {
      setErrorMessage("Debes seleccionar un proveedor.");
      return;
    }

    if (!form.transactionDate) {
      setErrorMessage("Debes indicar la fecha de recepción.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const transactionId = await createInventoryReceipt({
        ...form,
        referenceNumber: form.referenceNumber.trim(),
        notes: form.notes.trim(),
      });

      router.push(`/operacion/inventario/recepciones/${transactionId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al crear la recepción.",
      );

      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] px-4 py-3">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <Link
              href="/operacion/inventario/recepciones"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              ← Volver a Recepciones
            </Link>

            <h1 className="mt-1 text-xl font-semibold text-neutral-950">
              Nueva recepción
            </h1>
          </div>

          <p className="text-xs text-neutral-500">
            Registra el ingreso de mercadería al inventario.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="referenceType"
                className="mb-1 block text-xs font-semibold text-neutral-700"
              >
                Tipo de movimiento
              </label>

              <select
                id="referenceType"
                value={form.referenceType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    referenceType: event.target.value as
                      | "PURCHASE"
                      | "INITIAL_STOCK",
                  }))
                }
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="PURCHASE">Compra</option>
                <option value="INITIAL_STOCK">Stock inicial</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="supplier"
                className="mb-1 block text-xs font-semibold text-neutral-700"
              >
                Proveedor
              </label>

              <select
                id="supplier"
                value={form.supplierId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    supplierId: Number(event.target.value),
                  }))
                }
                disabled={loadingSuppliers || suppliers.length === 0}
                required
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-neutral-100"
              >
                {loadingSuppliers ? (
                  <option value={0}>Cargando proveedores...</option>
                ) : suppliers.length === 0 ? (
                  <option value={0}>No hay proveedores activos</option>
                ) : (
                  suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} · {supplier.code}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="transactionDate"
                className="mb-1 block text-xs font-semibold text-neutral-700"
              >
                Fecha de recepción
              </label>

              <input
                id="transactionDate"
                type="datetime-local"
                value={form.transactionDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    transactionDate: event.target.value,
                  }))
                }
                required
                className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="referenceNumber"
                className="mb-1 block text-xs font-semibold text-neutral-700"
              >
                Número de documento
              </label>

              <input
                id="referenceNumber"
                type="text"
                value={form.referenceNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    referenceNumber: event.target.value,
                  }))
                }
                placeholder="Ejemplo: 1542"
                maxLength={100}
                className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="mb-1 block text-xs font-semibold text-neutral-700"
              >
                Observaciones
              </label>

              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={2}
                maxLength={1000}
                placeholder="Información adicional de la recepción."
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Link
              href="/operacion/inventario/recepciones"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                submitting || loadingSuppliers || suppliers.length === 0
              }
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Guardar y agregar productos"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
