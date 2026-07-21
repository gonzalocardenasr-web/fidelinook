"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getInventoryReceiptById,
  type InventoryReceiptDetail,
  type InventoryReceiptStatus,
} from "@/lib/inventory/receipt";

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

function getReferenceTypeLabel(referenceType: string | null): string {
  if (!referenceType) {
    return "Sin documento";
  }

  const labels: Record<string, string> = {
    INVOICE: "Factura",
    RECEIPT: "Boleta",
    DISPATCH_NOTE: "Guía de despacho",
    OTHER: "Otro",
  };

  return labels[referenceType] ?? referenceType;
}

export default function InventoryReceiptDetailPage() {
  const params = useParams<{ transactionId: string }>();

  const [receipt, setReceipt] = useState<InventoryReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const transactionId = Number(params.transactionId);

  useEffect(() => {
    async function loadReceipt() {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!Number.isInteger(transactionId) || transactionId <= 0) {
          throw new Error("El identificador de la recepción no es válido.");
        }

        const receiptDetail = await getInventoryReceiptById(transactionId);

        setReceipt(receiptDetail);
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

    void loadReceipt();
  }, [transactionId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6F3FF] px-4 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
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
      <main className="min-h-screen bg-[#F6F3FF] px-4 py-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <Link
            href="/operacion/inventario/recepciones"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Volver a Recepciones
          </Link>

          <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-neutral-950">
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
    <main className="min-h-screen bg-[#F6F3FF] px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <Link
            href="/operacion/inventario/recepciones"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Volver a Recepciones
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-950">
                Recepción #{receipt.id}
              </h1>

              <p className="mt-1 text-sm text-neutral-600">
                Detalle de la recepción de inventario.
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${getStatusClasses(
                receipt.status,
              )}`}
            >
              {getStatusLabel(receipt.status)}
            </span>
          </div>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-950">
            Información de la recepción
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Proveedor
              </dt>
              <dd className="mt-1 text-sm font-medium text-neutral-900">
                {receipt.supplierName ?? "Sin proveedor"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Fecha de recepción
              </dt>
              <dd className="mt-1 text-sm font-medium text-neutral-900">
                {formatDateTime(receipt.transactionDate)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tipo de documento
              </dt>
              <dd className="mt-1 text-sm font-medium text-neutral-900">
                {getReferenceTypeLabel(receipt.referenceType)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Número de documento
              </dt>
              <dd className="mt-1 text-sm font-medium text-neutral-900">
                {receipt.referenceNumber || "Sin número"}
              </dd>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Observaciones
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {receipt.notes || "Sin observaciones"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                Productos recibidos
              </h2>

              <p className="mt-1 text-sm text-neutral-600">
                {receipt.items.length === 1
                  ? "1 producto registrado"
                  : `${receipt.items.length} productos registrados`}
              </p>
            </div>

            <button
              type="button"
              disabled
              title={
                isDraft
                  ? "Se habilitará en el siguiente desarrollo."
                  : "Una recepción publicada no puede modificarse."
              }
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar producto
            </button>
          </div>

          {receipt.items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-neutral-700">
                Esta recepción todavía no tiene productos.
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Los productos podrán agregarse mientras la recepción permanezca
                en borrador.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Costo unitario
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Costo total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 bg-white">
                  {receipt.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-neutral-900">
                          {item.inventoryItemName}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {item.inventoryItemCode} · {item.itemType}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-medium text-neutral-900">
                        {item.quantity} {item.unit}
                      </td>

                      <td className="px-6 py-4 text-right text-sm text-neutral-700">
                        {item.unitCost === null
                          ? "Sin costo"
                          : formatCurrency(item.unitCost)}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-semibold text-neutral-900">
                        {formatCurrency(item.totalCost)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled
                          className="text-sm font-semibold text-violet-600 disabled:cursor-not-allowed disabled:text-neutral-400"
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

          <div className="grid gap-4 border-t border-neutral-200 bg-neutral-50 px-6 py-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Líneas
              </p>
              <p className="mt-1 text-lg font-bold text-neutral-950">
                {receipt.items.length}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Unidades totales
              </p>
              <p className="mt-1 text-lg font-bold text-neutral-950">
                {receipt.totalUnits}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Costo total
              </p>
              <p className="mt-1 text-lg font-bold text-neutral-950">
                {formatCurrency(receipt.totalCost)}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap justify-between gap-3">
          <Link
            href="/operacion/inventario/recepciones"
            className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Volver al listado
          </Link>

          <button
            type="button"
            disabled
            title={
              isDraft
                ? "Se habilitará después de incorporar productos."
                : "La recepción ya no se encuentra en borrador."
            }
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Publicar recepción
          </button>
        </section>
      </div>
    </main>
  );
}
