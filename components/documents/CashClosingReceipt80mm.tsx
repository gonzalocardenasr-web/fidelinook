import Image from "next/image";

import type { CashRecommendationEntry } from "../../lib/cash/cashWithdrawalRecommendation";

export type CashClosingReceiptDocument = {
  sessionId: number;
  closedAt: string;
  closedByRole: string;
  openingAmount: number;
  expectedCashAmount: number;
  countedCashAmount: number;
  cashDifference: number;
  targetRetainedAmount: number;
  retainedAmount: number;
  withdrawalAmount: number;
  exactTarget: boolean;
  withdrawalCashCount: CashRecommendationEntry[];
  closingNotes: string | null;
};

type Props = {
  document: CashClosingReceiptDocument;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  if (role === "superadmin") {
    return "Superadmin";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "cashier") {
    return "Cajero";
  }

  return role || "—";
}

export default function CashClosingReceipt80mm({ document }: Props) {
  const withdrawalEntries = document.withdrawalCashCount.filter(
    (entry) => entry.quantity > 0,
  );

  return (
    <article className="cash-closing-receipt mx-auto w-[72mm] bg-white px-[2mm] py-[3mm] font-sans text-black">
      <header className="text-center">
        <div className="flex h-[17mm] items-center justify-center overflow-hidden">
          <Image
            src="/nook-logo-negro.png"
            alt="Nook"
            width={190}
            height={80}
            priority
            className="block h-auto w-[42mm] object-contain"
          />
        </div>

        <div className="mb-[3mm] mt-[1mm] border-t border-dashed border-black" />

        <p className="text-[13px] font-black uppercase">
          Comprobante de cierre de caja
        </p>

        <p className="mt-1 text-[10px] leading-tight">
          {formatDateTime(document.closedAt)}
        </p>
      </header>

      <section className="mt-[3mm] space-y-[1mm] text-[10px] leading-tight">
        <div className="flex justify-between gap-3">
          <span className="font-bold">Sesión</span>
          <span className="font-black">#{document.sessionId}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="font-bold">Responsable</span>
          <span>{roleLabel(document.closedByRole)}</span>
        </div>
      </section>

      <div className="my-[3mm] border-t border-dashed border-black" />

      <section className="space-y-[1mm] text-[10px] leading-tight">
        <div className="flex justify-between gap-3">
          <span>Fondo de apertura</span>
          <span className="font-bold">
            {formatMoney(document.openingAmount)}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span>Efectivo esperado</span>
          <span className="font-bold">
            {formatMoney(document.expectedCashAmount)}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span>Efectivo contado</span>
          <span className="font-bold">
            {formatMoney(document.countedCashAmount)}
          </span>
        </div>

        <div className="flex justify-between gap-3 border-t border-black pt-[1mm]">
          <span className="font-black">Diferencia de caja</span>
          <span className="font-black">
            {formatMoney(document.cashDifference)}
          </span>
        </div>
      </section>

      <div className="my-[3mm] border-t border-dashed border-black" />

      <section>
        <p className="text-[10px] font-black uppercase">
          Retiro / depósito recomendado
        </p>

        {document.exactTarget ? (
          <>
            <div className="mt-[2mm] space-y-[1mm] text-[10px]">
              {withdrawalEntries.length > 0 ? (
                withdrawalEntries.map((entry) => (
                  <div
                    key={entry.denomination}
                    className="grid grid-cols-[1fr_12mm_20mm] gap-1"
                  >
                    <span>{formatMoney(entry.denomination)}</span>
                    <span className="text-right">x{entry.quantity}</span>
                    <span className="text-right font-bold">
                      {formatMoney(entry.subtotal)}
                    </span>
                  </div>
                ))
              ) : (
                <p>No corresponde retirar efectivo.</p>
              )}
            </div>

            <div className="mt-[2mm] flex items-end justify-between gap-3 border-t border-black pt-[2mm]">
              <span className="text-[11px] font-black uppercase">
                Total retiro
              </span>

              <span className="text-[16px] font-black">
                {formatMoney(document.withdrawalAmount)}
              </span>
            </div>

            <div className="mt-[2mm] flex justify-between gap-3 text-[10px]">
              <span className="font-bold">Fondo que queda</span>

              <span className="font-black">
                {formatMoney(document.retainedAmount)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-[2mm] border border-black p-[2mm] text-[9px] leading-tight">
            No fue posible formar exactamente el fondo objetivo de{" "}
            <strong>{formatMoney(document.targetRetainedAmount)}</strong> con el
            efectivo contado. No se genera una recomendación de retiro.
          </div>
        )}
      </section>

      {document.closingNotes && (
        <>
          <div className="my-[3mm] border-t border-dashed border-black" />

          <section className="text-[9px] leading-tight">
            <p className="font-black uppercase">Observación de cierre</p>

            <p className="mt-1">{document.closingNotes}</p>
          </section>
        </>
      )}

      <div className="my-[3mm] border-t border-dashed border-black" />

      <footer className="text-center text-[9px] leading-tight">
        <p className="font-bold">Nook</p>

        <p className="mt-1">
          Comprobante interno de cierre y retiro de efectivo.
        </p>
      </footer>
    </article>
  );
}
