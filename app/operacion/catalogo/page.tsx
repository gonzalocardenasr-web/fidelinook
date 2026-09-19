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
  product_channels?: {
    channel_code: string;
    is_enabled: boolean;
  }[];
};

type SalesChannel = {
  code: string;
  name: string;
  channel_type: string;
  is_active: boolean;
  sort_order: number;
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
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
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
      setSalesChannels(data.salesChannels || []);
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

  const categories = useMemo(
    () =>
      [...new Set(products.map((product) => product.category))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es")),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch) ||
        (product.subcategory || "").toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active);

      const matchesChannel =
        channelFilter === "all" ||
        product.product_channels?.some(
          (productChannel) =>
            productChannel.channel_code === channelFilter &&
            productChannel.is_enabled,
        );

      return (
        matchesSearch && matchesCategory && matchesStatus && matchesChannel
      );
    });
  }, [products, search, categoryFilter, statusFilter, channelFilter]);

  function isProductEnabledForChannel(product: Product, channelCode: string) {
    return Boolean(
      product.product_channels?.some(
        (productChannel) =>
          productChannel.channel_code === channelCode &&
          productChannel.is_enabled,
      ),
    );
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
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-neutral-900">
                    Catálogo Maestro
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {filteredProducts.length} de {products.length} productos
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por producto, SKU o categoría"
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>

                <select
                  value={channelFilter}
                  onChange={(event) => setChannelFilter(event.target.value)}
                  className="h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">Todos los canales</option>
                  {salesChannels.map((channel) => (
                    <option key={channel.code} value={channel.code}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1050px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Clasificación</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Precio local</th>
                      <th className="px-3 py-2">Canales</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="rounded-l-2xl bg-[#FCF8FF] px-3 py-3">
                          <p className="font-bold text-neutral-900">
                            {product.name}
                          </p>
                          <p className="mt-1 font-mono text-xs text-neutral-500">
                            {product.sku}
                          </p>
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3">
                          <p className="font-semibold text-neutral-700">
                            {product.category}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {product.subcategory || "Sin subcategoría"}
                          </p>
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3 text-neutral-600">
                          {product.operational_type}
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3 font-bold text-neutral-900">
                          {getLocalPrice(product).toLocaleString("es-CL", {
                            style: "currency",
                            currency: "CLP",
                            maximumFractionDigits: 0,
                          })}
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {salesChannels.map((channel) => {
                              const enabled = isProductEnabledForChannel(
                                product,
                                channel.code,
                              );

                              return (
                                <span
                                  key={channel.code}
                                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                    enabled
                                      ? "bg-violet-100 text-violet-700"
                                      : "bg-neutral-100 text-neutral-400"
                                  }`}
                                >
                                  {channel.name}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="rounded-r-2xl bg-[#FCF8FF] px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              product.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {product.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="rounded-2xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500"
                        >
                          No hay productos que coincidan con los filtros.
                        </td>
                      </tr>
                    )}
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
