"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ClienteSelector, {
  ClienteSelectorValue,
} from "../../../../components/client/ClienteSelector";
import ProductGrid from "../../../../components/sales/ProductGrid";
import OrderBuilder from "../../../../components/sales/OrderBuilder";
import { CartItem, OptionGroup, Product } from "../../../../types/sales";

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
          <ProductGrid
            products={products}
            loading={loading}
            getPrice={getPrice}
            onAdd={addProduct}
          />

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
          />
        </div>
      </div>
    </main>
  );
}
