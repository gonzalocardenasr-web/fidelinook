import { Product } from "../../types/sales";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  loading: boolean;
  getPrice: (product: Product) => number;
  onAdd: (product: Product) => void;
};

export default function ProductGrid({
  products,
  loading,
  getPrice,
  onAdd,
}: Props) {
  return (
    <section className="h-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Productos
          </h2>
          <p className="text-xs text-neutral-400">
            {products.length} disponible{products.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Cargando catálogo...</p>
      ) : products.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-400">
          No hay productos en esta categoría.
        </div>
      ) : (
        <div className="mt-3 grid gap-2 xl:grid-cols-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              price={getPrice(product)}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
