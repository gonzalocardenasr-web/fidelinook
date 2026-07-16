"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import CustomerOrderTicket80mm from "../../../../../components/documents/CustomerOrderTicket80mm";
import { SaleDocument } from "../../../../../lib/documents/sales/types";

export default function TicketPedidoPage() {
  const params = useParams();
  const saleId = Number(params.saleId);

  const [document, setDocument] = useState<SaleDocument | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!Number.isInteger(saleId) || saleId <= 0) {
      setMessage("La venta indicada no es válida.");
      setLoading(false);
      return;
    }

    void cargarDocumento();
  }, [saleId]);

  async function cargarDocumento() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(
        `/api/operacion/sales/document?saleId=${saleId}`,
        {
          cache: "no-store",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar el ticket.");
        return;
      }

      setDocument(data.document || null);
    } catch (error) {
      console.error("Error cargando ticket:", error);

      setMessage("Ocurrió un error al cargar el ticket.");
    } finally {
      setLoading(false);
    }
  }

  function imprimir() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:min-h-0 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white;
          }

          body * {
            visibility: hidden;
          }

          .print-root,
          .print-root * {
            visibility: visible;
          }

          .print-root {
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          .customer-order-ticket {
            width: 72mm !important;
            min-height: auto !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
        <Link
          href="/operacion/ventas"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:bg-neutral-50"
        >
          ← Historial
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarDocumento}
            disabled={loading}
            className="cursor-pointer rounded-lg border border-violet-200 bg-white px-3 py-2 text-[12px] font-bold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Actualizar
          </button>

          <button
            type="button"
            onClick={imprimir}
            disabled={!document || loading}
            className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir ticket
          </button>
        </div>
      </div>

      {loading ? (
        <div className="no-print mx-auto max-w-md rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm">
          Cargando ticket...
        </div>
      ) : message ? (
        <div className="no-print mx-auto max-w-md rounded-xl border border-red-100 bg-white p-6 text-center text-sm font-semibold text-red-700 shadow-sm">
          {message}
        </div>
      ) : document ? (
        <div className="print-root mx-auto w-[80mm] bg-white shadow-lg print:shadow-none">
          <CustomerOrderTicket80mm document={document} />
        </div>
      ) : null}
    </main>
  );
}
