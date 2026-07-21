import Link from "next/link";

import {
  getInventoryReceipts,
  type InventoryReceiptListItem,
} from "@/lib/inventory/receipts";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatDate(value: string): string {
  const normalizedDate = value.includes("T") ? value : `${value}T12:00:00`;

  return dateFormatter.format(new Date(normalizedDate));
}

function getStatusLabel(status: InventoryReceiptListItem["status"]): string {
  const labels: Record<InventoryReceiptListItem["status"], string> = {
    DRAFT: "Borrador",
    POSTED: "Publicada",
    CANCELLED: "Cancelada",
  };

  return labels[status];
}

function getStatusClasses(status: InventoryReceiptListItem["status"]): string {
  const classes: Record<InventoryReceiptListItem["status"], string> = {
    DRAFT: "bg-amber-50 text-amber-800 ring-amber-200",
    POSTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    CANCELLED: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  };

  return classes[status];
}

export default async function InventoryReceiptsPage() {
  const receipts = await getInventoryReceipts();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/operacion/inventario"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Volver a Inventario
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-neutral-950">
            Recepciones de mercadería
          </h1>

          <p className="mt-1 text-sm text-neutral-600">
            Compras recibidas desde proveedores y su estado de publicación.
          </p>
        </div>

        <Link
          href="/operacion/inventario/recepciones/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Nueva recepción
        </Link>
      </header>

      {receipts.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-neutral-950">
            No hay recepciones registradas
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            La primera recepción permitirá registrar las bachas recibidas desde
            Rocciato y aumentar el stock disponible.
          </p>

          <Link
            href="/operacion/inventario/recepciones/nueva"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Registrar primera recepción
          </Link>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    ID
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Fecha
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Proveedor
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Documento
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Productos
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Unidades
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Costo
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Estado
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-neutral-950">
                      #{receipt.id}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-700">
                      {formatDate(receipt.transactionDate)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-700">
                      {receipt.supplierName ?? "Sin proveedor"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-700">
                      {receipt.referenceNumber ?? "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-neutral-700">
                      {receipt.itemCount}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-neutral-700">
                      {receipt.totalUnits}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-neutral-700">
                      {currencyFormatter.format(receipt.totalCost)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                          receipt.status,
                        )}`}
                      >
                        {getStatusLabel(receipt.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <Link
                        href={`/operacion/inventario/recepciones/${receipt.id}`}
                        className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        {receipt.status === "DRAFT" ? "Continuar" : "Ver"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
