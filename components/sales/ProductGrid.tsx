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
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900">Productos</h2>

      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Cargando catálogo...</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
