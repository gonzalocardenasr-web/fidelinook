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
      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left transition duration-150 hover:border-violet-300 hover:bg-violet-50 active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black leading-tight text-neutral-900">
          {product.name}
        </p>

        <p className="mt-0.5 text-[11px] leading-tight text-neutral-500">
          {product.subcategory || product.category}
        </p>
      </div>

      <p className="shrink-0 text-[13px] font-black text-violet-700">
        ${price.toLocaleString("es-CL")}
      </p>
    </button>
  );
}
