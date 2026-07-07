"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  subcategory?: string | null;
  operational_type: string;
  has_flavors: boolean;
  max_flavors: number;
  allows_toppings: boolean;
  max_toppings: number;
  requires_preparation: boolean;
  is_active: boolean;
  product_prices?: {
    id: number;
    channel: string;
    price_list: string;
    price: number;
    is_active: boolean;
  }[];
};

type OptionValue = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type OptionGroup = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  catalog_option_values: OptionValue[];
};

export default function CatalogoOperacionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    cargarCatalogo();
  }, []);

  async function cargarCatalogo() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/catalogo");
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar catálogo.");
        return;
      }

      setProducts(data.products || []);
      setOptionGroups(data.optionGroups || []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando catálogo.");
    } finally {
      setLoading(false);
    }
  }

  function getLocalPrice(product: Product) {
    return (
      product.product_prices?.find(
        (price) =>
          price.channel === "local" &&
          price.price_list === "general" &&
          price.is_active,
      )?.price || 0
    );
  }

  function updateProductLocal(
    productId: number,
    patch: Partial<Product> & { localPrice?: number },
  ) {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) return product;

        const next = { ...product, ...patch };

        if (patch.localPrice !== undefined) {
          const activePrice = next.product_prices?.find(
            (price) =>
              price.channel === "local" &&
              price.price_list === "general" &&
              price.is_active,
          );

          if (activePrice) {
            next.product_prices = next.product_prices?.map((price) =>
              price.id === activePrice.id
                ? { ...price, price: patch.localPrice! }
                : price,
            );
          }
        }

        return next;
      }),
    );
  }

  function updateOptionLocal(
    optionValueId: number,
    patch: Partial<OptionValue>,
  ) {
    setOptionGroups((current) =>
      current.map((group) => ({
        ...group,
        catalog_option_values: group.catalog_option_values.map((option) =>
          option.id === optionValueId ? { ...option, ...patch } : option,
        ),
      })),
    );
  }

  async function guardarProducto(product: Product) {
    try {
      setSavingKey(`product-${product.id}`);
      setMessage("");

      const res = await fetch("/api/catalogo/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          name: product.name,
          isActive: product.is_active,
          price: getLocalPrice(product),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar producto.");
        return;
      }

      setMessage("Producto actualizado correctamente.");
      await cargarCatalogo();
    } catch (error) {
      console.error(error);
      setMessage("Error guardando producto.");
    } finally {
      setSavingKey(null);
    }
  }

  async function guardarOpcion(option: OptionValue) {
    try {
      setSavingKey(`option-${option.id}`);
      setMessage("");

      const res = await fetch("/api/catalogo/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionValueId: option.id,
          name: option.name,
          isActive: option.is_active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar opción.");
        return;
      }

      setMessage("Opción actualizada correctamente.");
      await cargarCatalogo();
    } catch (error) {
      console.error(error);
      setMessage("Error guardando opción.");
    } finally {
      setSavingKey(null);
    }
  }

  const sabores = useMemo(
    () => optionGroups.find((group) => group.code === "flavor"),
    [optionGroups],
  );

  const toppings = useMemo(
    () => optionGroups.find((group) => group.code === "topping"),
    [optionGroups],
  );

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <Link
            href="/operacion"
            className="inline-flex rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition duration-200 hover:bg-white/25 active:scale-[0.98]"
          >
            ← Volver a operación
          </Link>

          <h1 className="mt-3 text-3xl font-bold">Catálogo operacional</h1>

          <p className="text-sm opacity-90">
            Administra productos, precios locales y opciones activas del POS.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-neutral-600 shadow-sm">
            Cargando catálogo...
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-neutral-900">Productos</h2>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Sabores</th>
                      <th className="px-3 py-2">Toppings</th>
                      <th className="px-3 py-2">Precio local</th>
                      <th className="px-3 py-2">Activo</th>
                      <th className="px-3 py-2 text-right">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="rounded-l-2xl bg-[#FCF8FF] px-3 py-3">
                          <input
                            value={product.name}
                            onChange={(event) =>
                              updateProductLocal(product.id, {
                                name: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          />
                          <p className="mt-1 text-xs text-neutral-500">
                            {product.sku}
                          </p>
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3 text-neutral-600">
                          {product.category}
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3 text-neutral-600">
                          {product.operational_type}
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3 text-neutral-600">
                          {product.has_flavors
                            ? `Sí (${product.max_flavors})`
                            : "No"}
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3 text-neutral-600">
                          {product.allows_toppings
                            ? `Sí (${product.max_toppings})`
                            : "No"}
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            value={getLocalPrice(product)}
                            onChange={(event) =>
                              updateProductLocal(product.id, {
                                localPrice: Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                ),
                              })
                            }
                            className="w-28 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          />
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateProductLocal(product.id, {
                                is_active: !product.is_active,
                              })
                            }
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
                              product.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                            }`}
                          >
                            {product.is_active ? "Activo" : "Inactivo"}
                          </button>
                        </td>

                        <td className="rounded-r-2xl bg-[#FCF8FF] px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => guardarProducto(product)}
                            disabled={savingKey === `product-${product.id}`}
                            className="cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition duration-200 hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingKey === `product-${product.id}`
                              ? "Guardando..."
                              : "Guardar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              {[sabores, toppings].filter(Boolean).map((group) => (
                <div
                  key={group!.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <h2 className="text-xl font-black text-neutral-900">
                    {group!.name}
                  </h2>

                  <div className="mt-4 space-y-3">
                    {group!.catalog_option_values
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-3 rounded-2xl bg-[#FCF8FF] p-3"
                        >
                          <input
                            value={option.name}
                            onChange={(event) =>
                              updateOptionLocal(option.id, {
                                name: event.target.value,
                              })
                            }
                            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateOptionLocal(option.id, {
                                is_active: !option.is_active,
                              })
                            }
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
                              option.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                            }`}
                          >
                            {option.is_active ? "Activo" : "Inactivo"}
                          </button>

                          <button
                            type="button"
                            onClick={() => guardarOpcion(option)}
                            disabled={savingKey === `option-${option.id}`}
                            className="cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition duration-200 hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingKey === `option-${option.id}`
                              ? "Guardando..."
                              : "Guardar"}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
