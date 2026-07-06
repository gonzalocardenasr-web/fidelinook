"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ClienteSelector, {
  ClienteSelectorValue,
} from "../../../../components/client/ClienteSelector";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  operational_type: string;
  has_flavors: boolean;
  max_flavors: number;
  allows_toppings: boolean;
  max_toppings: number;
  product_prices?: {
    price: number;
    channel: string;
    price_list: string;
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
  catalog_option_values: OptionValue[];
};

type CartItem = {
  localId: string;
  product: Product;
  quantity: number;
  flavorIds: number[];
  toppingIds: number[];
  notes: string;
};

export default function NuevaVentaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedCliente, setSelectedCliente] =
    useState<ClienteSelectorValue | null>(null);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  async function cargarCatalogo() {
    try {
      setLoading(true);

      const res = await fetch("/api/operacion/catalogo");
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

  const flavors = useMemo(() => {
    return (
      optionGroups.find((group) => group.code === "flavor")
        ?.catalog_option_values || []
    )
      .filter((option) => option.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [optionGroups]);

  const toppings = useMemo(() => {
    return (
      optionGroups.find((group) => group.code === "topping")
        ?.catalog_option_values || []
    )
      .filter((option) => option.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [optionGroups]);

  function getPrice(product: Product) {
    return (
      product.product_prices?.find(
        (price) =>
          price.channel === "local" &&
          price.price_list === "general" &&
          price.is_active,
      )?.price || 0
    );
  }

  function addProduct(product: Product) {
    setCart((current) => [
      ...current,
      {
        localId: `${product.id}-${Date.now()}-${Math.random()}`,
        product,
        quantity: 1,
        flavorIds: [],
        toppingIds: [],
        notes: "",
      },
    ]);
  }

  function removeItem(localId: string) {
    setCart((current) => current.filter((item) => item.localId !== localId));
  }

  function updateItem(localId: string, patch: Partial<CartItem>) {
    setCart((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }

  function toggleFlavor(item: CartItem, flavorId: number) {
    const exists = item.flavorIds.includes(flavorId);

    if (exists) {
      updateItem(item.localId, {
        flavorIds: item.flavorIds.filter((id) => id !== flavorId),
      });
      return;
    }

    if (item.flavorIds.length >= item.product.max_flavors) return;

    updateItem(item.localId, {
      flavorIds: [...item.flavorIds, flavorId],
    });
  }

  function toggleTopping(item: CartItem, toppingId: number) {
    const exists = item.toppingIds.includes(toppingId);

    if (exists) {
      updateItem(item.localId, {
        toppingIds: item.toppingIds.filter((id) => id !== toppingId),
      });
      return;
    }

    if (item.toppingIds.length >= item.product.max_toppings) return;

    updateItem(item.localId, {
      toppingIds: [...item.toppingIds, toppingId],
    });
  }

  const total = cart.reduce(
    (acc, item) => acc + getPrice(item.product) * item.quantity,
    0,
  );

  function validarVenta() {
    if (cart.length === 0) return "Agrega al menos un producto.";

    for (const item of cart) {
      if (item.product.has_flavors && item.flavorIds.length === 0) {
        return `Debes seleccionar sabor para ${item.product.name}.`;
      }

      if (
        item.product.has_flavors &&
        item.flavorIds.length > item.product.max_flavors
      ) {
        return `${item.product.name} supera el máximo de sabores.`;
      }

      if (
        item.product.allows_toppings &&
        item.toppingIds.length > item.product.max_toppings
      ) {
        return `${item.product.name} supera el máximo de toppings.`;
      }
    }

    return null;
  }

  async function confirmarVenta() {
    const error = validarVenta();

    if (error) {
      setMessage(error);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        paymentMethod,
        customerId: selectedCliente?.id || null,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          options: [
            ...item.flavorIds.map((id) => ({
              option_group_code: "flavor",
              option_value_id: id,
              quantity: 1,
            })),
            ...item.toppingIds.map((id) => ({
              option_group_code: "topping",
              option_value_id: id,
              quantity: 1,
            })),
          ],
        })),
      };

      const res = await fetch("/api/operacion/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo crear la venta.");
        return;
      }

      setCart([]);
      setMessage(
        `Venta creada correctamente. Pedido ${data.result.display_order_code}.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("Error inesperado al confirmar venta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <Link href="/operacion" className="text-sm font-medium text-white/90">
            ← Volver a operación
          </Link>
          <h1 className="mt-3 text-2xl font-bold">Nueva venta local</h1>
          <p className="text-sm opacity-90">
            Registra una venta y genera automáticamente un pedido operacional.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900">Productos</h2>

            {loading ? (
              <p className="mt-4 text-sm text-neutral-600">
                Cargando catálogo...
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    <p className="font-semibold text-neutral-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {product.category} · {product.operational_type}
                    </p>
                    <p className="mt-2 text-sm font-bold text-violet-700">
                      ${getPrice(product).toLocaleString("es-CL")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900">Pedido</h2>

            <div className="mt-4">
              <ClienteSelector
                value={selectedCliente}
                onChange={setSelectedCliente}
              />
            </div>

            <div className="mt-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Aún no hay productos agregados.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.localId}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-neutral-600">
                          ${getPrice(item.product).toLocaleString("es-CL")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.localId)}
                        className="text-sm font-semibold text-red-600"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs font-semibold text-neutral-600">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.localId, {
                            quantity: Math.max(
                              1,
                              Number(event.target.value) || 1,
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>

                    {item.product.has_flavors && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-neutral-600">
                          Sabores ({item.flavorIds.length}/
                          {item.product.max_flavors})
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {flavors.map((flavor) => (
                            <button
                              key={flavor.id}
                              type="button"
                              onClick={() => toggleFlavor(item, flavor.id)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                item.flavorIds.includes(flavor.id)
                                  ? "bg-violet-600 text-white"
                                  : "bg-white text-neutral-700"
                              }`}
                            >
                              {flavor.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.product.allows_toppings && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-neutral-600">
                          Toppings ({item.toppingIds.length}/
                          {item.product.max_toppings})
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {toppings.map((topping) => (
                            <button
                              key={topping.id}
                              type="button"
                              onClick={() => toggleTopping(item, topping.id)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                item.toppingIds.includes(topping.id)
                                  ? "bg-black text-white"
                                  : "bg-white text-neutral-700"
                              }`}
                            >
                              {topping.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="text-xs font-semibold text-neutral-600">
                        Nota
                      </label>
                      <input
                        value={item.notes}
                        onChange={(event) =>
                          updateItem(item.localId, {
                            notes: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                        placeholder="Ej: sin barquillo"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-neutral-200 pt-4">
              <label className="text-sm font-semibold text-neutral-700">
                Medio de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm"
              >
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
                <option value="manual">Manual</option>
              </select>

              <div className="mt-4 flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toLocaleString("es-CL")}</span>
              </div>

              <button
                type="button"
                onClick={confirmarVenta}
                disabled={saving || cart.length === 0}
                className="mt-4 w-full rounded-2xl bg-violet-600 px-5 py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Confirmando..." : "Confirmar venta"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
