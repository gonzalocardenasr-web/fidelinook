"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ClienteSelector, {
  ClienteSelectorValue,
} from "../../../../components/client/ClienteSelector";
import ProductGrid from "../../../../components/sales/ProductGrid";
import OrderBuilder from "../../../../components/sales/OrderBuilder";
import { CartItem, OptionGroup, Product } from "../../../../types/sales";
import POSLayout from "../../../../components/pos/POSLayout";

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
        flavorSelections: [],
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
    const maxFlavors = item.product.max_flavors || 0;
    const currentSelections = item.flavorSelections || [];

    if (maxFlavors <= 0) return;

    if (currentSelections.length >= maxFlavors) {
      updateItem(item.localId, {
        flavorSelections: currentSelections.slice(0, -1),
      });
      return;
    }

    updateItem(item.localId, {
      flavorSelections: [...currentSelections, flavorId],
    });
  }

  function removeFlavorSelection(item: CartItem, selectionIndex: number) {
    updateItem(item.localId, {
      flavorSelections: item.flavorSelections.filter(
        (_flavorId, index) => index !== selectionIndex,
      ),
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
      if (item.product.has_flavors && item.flavorSelections.length === 0) {
        return `Debes seleccionar sabor para ${item.product.name}.`;
      }

      if (
        item.product.has_flavors &&
        item.flavorSelections.length > item.product.max_flavors
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
            ...item.flavorSelections.map((id) => ({
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
    <POSLayout
      title="Venta local"
      subtitle="POS Operacional Nook"
      left={
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Categorías
          </h2>

          <div className="mt-3 space-y-2">
            {[...new Set(products.map((product) => product.category))].map(
              (category) => (
                <button
                  key={category}
                  type="button"
                  className="w-full cursor-pointer rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-left text-sm font-bold text-neutral-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
                >
                  {category}
                </button>
              ),
            )}
          </div>
        </div>
      }
      center={
        <ProductGrid
          products={products}
          loading={loading}
          getPrice={getPrice}
          onAdd={addProduct}
        />
      }
      right={
        <OrderBuilder
          cart={cart}
          flavors={flavors}
          toppings={toppings}
          selectedCliente={selectedCliente}
          paymentMethod={paymentMethod}
          total={total}
          saving={saving}
          getPrice={getPrice}
          onClienteChange={setSelectedCliente}
          onPaymentMethodChange={setPaymentMethod}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onToggleFlavor={toggleFlavor}
          onToggleTopping={toggleTopping}
          onConfirm={confirmarVenta}
          onRemoveFlavorSelection={removeFlavorSelection}
        />
      }
      context={
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Contexto
          </h2>

          {selectedCliente ? (
            <div className="mt-3 rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-600">
                Cliente seleccionado
              </p>
              <p className="mt-1 font-bold text-neutral-900">
                {selectedCliente.nombre}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {selectedCliente.telefono ||
                  selectedCliente.correo ||
                  "Sin contacto"}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
              Sin cliente seleccionado.
            </div>
          )}

          <div className="mt-3 rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Pedido
            </p>
            <p className="mt-1 text-2xl font-black text-neutral-900">
              {cart.length}
            </p>
            <p className="text-xs text-neutral-500">ítems agregados</p>
          </div>

          {message && (
            <div className="mt-3 rounded-2xl border border-violet-100 bg-white p-4 text-sm text-neutral-700">
              {message}
            </div>
          )}
        </div>
      }
    />
  );
}
