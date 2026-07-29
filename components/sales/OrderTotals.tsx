type Props = {
  subtotal: number;
  potQuantity: number;
  discountRate: number;
  potDiscountTotal: number;
  giftDiscountTotal: number;
  manualDiscountAmount: number;
  discountTotal: number;
  total: number;
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

export default function OrderTotals({
  subtotal,
  potQuantity,
  discountRate,
  potDiscountTotal,
  giftDiscountTotal,
  manualDiscountAmount,
  discountTotal,
  total,
}: Props) {
  const discountPercentage = Math.round(discountRate * 100);

  return (
    <div className="space-y-1.5">
      {discountTotal > 0 && (
        <>
          <div className="flex items-center justify-between text-[11px] text-neutral-600">
            <span>Subtotal</span>

            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>

          {potDiscountTotal > 0 && (
            <div className="flex items-start justify-between gap-3 text-[11px] text-violet-700">
              <div className="min-w-0">
                <p className="font-bold">
                  Descuento potes {discountPercentage}%
                </p>

                <p className="text-[10px] text-violet-600">
                  Promoción por {potQuantity} potes
                </p>
              </div>

              <span className="shrink-0 font-bold">
                -{formatCurrency(potDiscountTotal)}
              </span>
            </div>
          )}

          {giftDiscountTotal > 0 && (
            <div className="flex items-center justify-between gap-3 text-[11px] text-emerald-700">
              <span className="font-bold">Productos de regalo</span>

              <span className="shrink-0 font-bold">
                -{formatCurrency(giftDiscountTotal)}
              </span>
            </div>
          )}

          {manualDiscountAmount > 0 && (
            <div className="flex items-center justify-between gap-3 text-[11px] text-amber-700">
              <span className="font-bold">Descuento manual</span>

              <span className="shrink-0 font-bold">
                -{formatCurrency(manualDiscountAmount)}
              </span>
            </div>
          )}

          <div className="border-t border-neutral-200" />
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[18px] font-black text-neutral-950">Total</span>

        <span className="text-[18px] font-black text-neutral-950">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
