import { Product } from "../../types/sales";
import ProductCard from "./ProductCard";
import { useMemo, useState, useEffect } from "react";

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

  const categoryNames = useMemo(
    () => Object.keys(groupedProducts),
    [groupedProducts],
  );

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    setExpandedCategory((current) => {
      if (current && categoryNames.includes(current)) {
        return current;
      }

      return categoryNames[0] ?? null;
    });
  }, [categoryNames]);

  function toggleCategory(category: string) {
    setExpandedCategory((current) => (current === category ? null : category));
  }

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
          className="mt-2 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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
          <div className="space-y-1.5">
            {Object.entries(groupedProducts).map(
              ([category, categoryProducts]) => {
                const expanded = expandedCategory === category;

                return (
                  <section
                    key={category}
                    className="rounded-lg border border-neutral-200 bg-neutral-50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left transition hover:bg-violet-50 active:bg-violet-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-violet-700">
                          {expanded ? "▼" : "▶"}
                        </span>

                        <span className="text-xs font-black uppercase tracking-wide text-neutral-700">
                          {category}
                        </span>
                      </div>

                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-neutral-500">
                        {categoryProducts.length}
                      </span>
                    </button>

                    {expanded && (
                      <div className="space-y-1.5 border-t border-neutral-200 p-1.5">
                        {categoryProducts.map((product) => (
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
              },
            )}
          </div>
        </div>
      )}
    </section>
  );
}
