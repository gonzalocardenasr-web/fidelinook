type Props = {
  subtotal: number;
  potQuantity: number;
  discountRate: number;
  potDiscountTotal: number;
  giftDiscountTotal: number;
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
  discountTotal,
  total,
}: Props) {
  const discountPercentage = Math.round(discountRate * 100);

  return (
    <div className="space-y-2">
      {discountTotal > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>Subtotal</span>

            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>

          {potDiscountTotal > 0 && (
            <div className="flex items-start justify-between gap-3 text-sm text-violet-700">
              <div>
                <p className="font-bold">
                  Descuento potes {discountPercentage}%
                </p>

                <p className="text-[11px] text-violet-600">
                  Promoción por {potQuantity} potes
                </p>
              </div>

              <span className="font-bold">
                -{formatCurrency(potDiscountTotal)}
              </span>
            </div>
          )}

          {giftDiscountTotal > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm text-emerald-700">
              <span className="font-bold">Productos de regalo</span>

              <span className="font-bold">
                -{formatCurrency(giftDiscountTotal)}
              </span>
            </div>
          )}

          <div className="border-t border-neutral-200" />
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xl font-black text-neutral-950">Total</span>

        <span className="text-xl font-black text-neutral-950">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
