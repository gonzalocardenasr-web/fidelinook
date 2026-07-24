type Props = {
  subtotal: number;
  potQuantity: number;
  discountRate: number;
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

          <div className="flex items-start justify-between gap-3 text-sm text-emerald-700">
            <div>
              <p className="font-bold">Descuento {discountPercentage}%</p>

              <p className="text-[11px] text-emerald-600">
                Promoción por {potQuantity} potes
              </p>
            </div>

            <span className="font-bold">-{formatCurrency(discountTotal)}</span>
          </div>

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
