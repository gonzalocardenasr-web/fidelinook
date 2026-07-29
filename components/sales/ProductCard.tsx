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
      className="group flex min-h-[104px] w-full cursor-pointer flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 text-left transition duration-150 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm active:translate-y-0 active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-black leading-tight text-neutral-900">
          {product.name}
        </p>

        <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-neutral-500">
          {product.subcategory || product.category}
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-400 transition group-hover:text-violet-500">
          Agregar
        </span>

        <span className="shrink-0 text-[13px] font-black text-violet-700">
          ${price.toLocaleString("es-CL")}
        </span>
      </div>
    </button>
  );
}
