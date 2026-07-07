import { Product } from "../../types/sales";

type Props = {
  product: Product;
  price: number;
  onAdd: (product: Product) => void;
};

export default function ProductCard({ product, price, onAdd }: Props) {
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md active:scale-[0.98]"
    >
      <p className="font-semibold text-neutral-900">{product.name}</p>

      <p className="mt-1 text-xs text-neutral-500">
        {product.category} · {product.operational_type}
      </p>

      <p className="mt-2 text-sm font-bold text-violet-700">
        ${price.toLocaleString("es-CL")}
      </p>
    </button>
  );
}
