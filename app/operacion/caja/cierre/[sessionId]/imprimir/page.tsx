"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import CashClosingReceipt80mm, {
  type CashClosingReceiptDocument,
} from "../../../../../../components/documents/CashClosingReceipt80mm";

import {
  recommendCashWithdrawal,
  type CashCountEntry,
} from "../../../../../../lib/cash/cashWithdrawalRecommendation";

type ClosingDetailResponse = {
  ok: boolean;
  message?: string;
  detail?: {
    session: {
      id: number;
      closed_at: string;
      closed_by_role: string;
      opening_amount: number;
      closing_notes: string | null;
    };
    summary: {
      openingAmount: number;
      expectedCashAmount: number;
      countedCashAmount: number;
      cashDifference: number;
    };
    closingCashCount: Array<
      CashCountEntry & {
        subtotal?: number;
      }
    >;
  };
};

export default function ImprimirCierreCajaPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const sessionId = Number(params.sessionId);
  const autoPrint = searchParams.get("autoPrint") === "1";

  const automaticPrintStarted = useRef(false);

  const [document, setDocument] = useState<CashClosingReceiptDocument | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      setMessage("El cierre indicado no es válido.");
      setLoading(false);
      return;
    }

    void cargarDocumento();
  }, [sessionId]);

  useEffect(() => {
    if (!document || !autoPrint || automaticPrintStarted.current) {
      return;
    }

    automaticPrintStarted.current = true;

    void imprimirCuandoEsteListo();
  }, [document, autoPrint]);

  async function cargarDocumento() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`/api/operacion/caja/cierres/${sessionId}`, {
        cache: "no-store",
      });

      const data = (await res.json()) as ClosingDetailResponse;

      if (!res.ok || !data.detail) {
        setMessage(
          data.message || "No se pudo cargar el comprobante de cierre.",
        );
        return;
      }

      const { session, summary, closingCashCount } = data.detail;

      /*
       * El fondo nominal corresponde a la apertura de la sesión.
       *
       * Si el efectivo esperado es menor —por ejemplo, por una salida
       * de efectivo correctamente registrada— se conserva el esperado.
       *
       * El efectivo contado NO redefine este objetivo y la diferencia
       * de caja continúa mostrándose independientemente.
       */
      const targetRetainedAmount = Number(summary.openingAmount);

      const recommendation = recommendCashWithdrawal(
        closingCashCount.map((entry) => ({
          denomination: Number(entry.denomination),
          quantity: Number(entry.quantity),
        })),
        targetRetainedAmount,
      );

      setDocument({
        sessionId: Number(session.id),
        closedAt: session.closed_at,
        closedByRole: session.closed_by_role,
        openingAmount: Number(summary.openingAmount || 0),
        expectedCashAmount: Number(summary.expectedCashAmount || 0),
        countedCashAmount: Number(summary.countedCashAmount || 0),
        cashDifference: Number(summary.cashDifference || 0),
        targetRetainedAmount: recommendation.targetRetainedAmount,
        retainedAmount: recommendation.retainedAmount,
        withdrawalAmount: recommendation.withdrawalAmount,
        exactTarget: recommendation.exactTarget,
        withdrawalCashCount: recommendation.withdrawalCashCount,
        closingNotes: session.closing_notes,
      });
    } catch (error) {
      console.error("Error cargando comprobante de cierre:", error);

      setMessage("Ocurrió un error al cargar el comprobante de cierre.");
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

      window.setTimeout(() => {
        window.print();
      }, 350);
    } catch (error) {
      console.error("No se pudo iniciar la impresión del cierre:", error);
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

          .cash-closing-receipt {
            width: 72mm !important;
            min-height: auto !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
        <Link
          href="/operacion/caja"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:bg-neutral-50"
        >
          ← Caja
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
            Imprimir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="no-print mx-auto max-w-md rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm">
          Cargando comprobante...
        </div>
      ) : message ? (
        <div className="no-print mx-auto max-w-md rounded-xl border border-red-100 bg-white p-6 text-center text-sm font-semibold text-red-700 shadow-sm">
          {message}
        </div>
      ) : document ? (
        <div className="print-root mx-auto w-[80mm] bg-white shadow-lg print:shadow-none">
          <CashClosingReceipt80mm document={document} />
        </div>
      ) : null}
    </main>
  );
}
