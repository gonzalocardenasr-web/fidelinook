import { Product } from "../../types/sales";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  loading: boolean;
  getPrice: (product: Product) => number;
  onAdd: (product: Product) => void;
  search: string;
  onSearchChange: (value: string) => void;
  compact?: boolean;
};

export default function ProductGrid({
  products,
  loading,
  getPrice,
  onAdd,
  search,
  onSearchChange,
  compact = false,
}: Props) {
  const groupedProducts = products.reduce<Record<string, Product[]>>(
    (acc, product) => {
      const category = product.category || "Sin categoría";
      acc[category] = acc[category] || [];
      acc[category].push(product);
      return acc;
    },
    {},
  );

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
              Productos
            </h2>
            <p className="text-xs text-neutral-400">
              {products.length} disponible{products.length === 1 ? "" : "s"}
            </p>
          </div>

          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="cursor-pointer rounded-lg px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50 active:scale-95"
            >
              Limpiar
            </button>
          )}
        </div>

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar producto, SKU o categoría"
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Cargando catálogo...</p>
      ) : products.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-400">
          No hay productos para esta búsqueda.
        </div>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3">
            {Object.entries(groupedProducts).map(
              ([category, categoryProducts]) => (
                <section key={category}>
                  <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-neutral-400">
                    {category}
                  </p>

                  <div
                    className={`grid gap-2 ${compact ? "grid-cols-1" : "xl:grid-cols-2"}`}
                  >
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        price={getPrice(product)}
                        onAdd={onAdd}
                      />
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  );
}
