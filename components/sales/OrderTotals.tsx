type Props = {
  total: number;
};

export default function OrderTotals({ total }: Props) {
  return (
    <div className="mt-4 flex items-center justify-between text-lg font-bold">
      <span>Total</span>
      <span>${total.toLocaleString("es-CL")}</span>
    </div>
  );
}
