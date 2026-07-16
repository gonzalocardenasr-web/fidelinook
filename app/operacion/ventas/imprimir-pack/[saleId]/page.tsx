"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import CustomerOrderTicket80mm from "../../../../../components/documents/CustomerOrderTicket80mm";
import SaleReceipt80mm from "../../../../../components/documents/SaleReceipt80mm";
import { SaleDocument } from "../../../../../lib/documents/sales/types";

export default function ImprimirPackVentaPage() {
  const params = useParams();
  const saleId = Number(params.saleId);
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("autoPrint") === "1";

  const [document, setDocument] = useState<SaleDocument | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const automaticPrintStarted = useRef(false);

  useEffect(() => {
    if (!Number.isInteger(saleId) || saleId <= 0) {
      setMessage("La venta indicada no es válida.");
      setLoading(false);
      return;
    }

    void cargarDocumento();
  }, [saleId]);

  useEffect(() => {
    if (!document || !autoPrint || automaticPrintStarted.current) {
      return;
    }

    automaticPrintStarted.current = true;

    void imprimirCuandoEsteListo();
  }, [document, autoPrint]);

  useEffect(() => {
    function handleAfterPrint() {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "NOOK_PRINT_COMPLETED",
            saleId,
          },
          window.location.origin,
        );
      }
    }

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
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
        setMessage(
          data.message || "No se pudieron cargar los documentos de la venta.",
        );
        return;
      }

      if (!data.document) {
        setMessage("La venta no entregó documentos para imprimir.");
        return;
      }

      setDocument(data.document);
    } catch (error) {
      console.error("Error cargando documentos de venta:", error);

      setMessage("Ocurrió un error al cargar los documentos de la venta.");
    } finally {
      setLoading(false);
    }
  }

  async function esperarImagenes() {
    const images = Array.from(window.document.images);

    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            const finish = () => resolve();

            image.addEventListener("load", finish, {
              once: true,
            });

            image.addEventListener("error", finish, {
              once: true,
            });
          }),
      ),
    );
  }

  async function imprimirCuandoEsteListo() {
    try {
      await esperarImagenes();

      /*
       * Damos un margen breve para que el navegador termine
       * de calcular estilos, dimensiones y saltos de página.
       */
      window.setTimeout(() => {
        window.print();
      }, 350);
    } catch (error) {
      console.error("No se pudo iniciar la impresión automática:", error);
    }
  }

  function imprimirNuevamente() {
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

          .print-pack,
          .print-pack * {
            visibility: visible;
          }

          .print-pack {
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
          }

          .print-document {
            width: 80mm;
            margin: 0;
            padding: 0;
          }

          .print-document-break {
            break-after: page;
            page-break-after: always;
          }

          .sale-receipt,
          .customer-order-ticket {
            width: 72mm !important;
            min-height: auto !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
        <Link
          href="/operacion/ventas/nueva"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:bg-neutral-50"
        >
          ← Nueva venta
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
            onClick={imprimirNuevamente}
            disabled={!document || loading}
            className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir nuevamente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="no-print mx-auto max-w-md rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm">
          Preparando comprobante y ticket...
        </div>
      ) : message ? (
        <div className="no-print mx-auto max-w-md rounded-xl border border-red-100 bg-white p-6 text-center text-sm font-semibold text-red-700 shadow-sm">
          {message}
        </div>
      ) : document ? (
        <div className="print-pack mx-auto w-[80mm] bg-white">
          <section className="print-document print-document-break">
            <SaleReceipt80mm document={document} />
          </section>

          <section className="print-document">
            <CustomerOrderTicket80mm document={document} />
          </section>
        </div>
      ) : null}
    </main>
  );
}
