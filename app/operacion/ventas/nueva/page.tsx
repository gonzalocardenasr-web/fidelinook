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
import POSContextPanel from "../../../../components/pos/POSContextPanel";

export default function NuevaVentaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [productSearch, setProductSearch] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [clienteSelectorResetKey, setClienteSelectorResetKey] = useState(0);

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

  const categories = useMemo(() => {
    const unique = [...new Set(products.map((product) => product.category))];
    return ["TODOS", ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "TODOS" || product.category === selectedCategory;

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search) ||
        product.operational_type.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, productSearch]);

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
        orderNotes,
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
      setOrderNotes("");
      setSelectedCliente(null);
      setClienteSelectorResetKey((current) => current + 1);
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
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`w-full cursor-pointer rounded-xl border px-3 py-3 text-left text-sm font-bold transition duration-200 active:scale-[0.98] ${
                  selectedCategory === category
                    ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                    : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
                }`}
              >
                {category === "TODOS" ? "Todos los productos" : category}
              </button>
            ))}
          </div>
        </div>
      }
      center={
        <ProductGrid
          products={filteredProducts}
          loading={loading}
          getPrice={getPrice}
          onAdd={addProduct}
          search={productSearch}
          onSearchChange={setProductSearch}
        />
      }
      right={
        <OrderBuilder
          cart={cart}
          flavors={flavors}
          toppings={toppings}
          selectedCliente={selectedCliente}
          paymentMethod={paymentMethod}
          orderNotes={orderNotes}
          clienteSelectorResetKey={clienteSelectorResetKey}
          total={total}
          saving={saving}
          getPrice={getPrice}
          onClienteChange={setSelectedCliente}
          onPaymentMethodChange={setPaymentMethod}
          onOrderNotesChange={setOrderNotes}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onToggleFlavor={toggleFlavor}
          onToggleTopping={toggleTopping}
          onRemoveFlavorSelection={removeFlavorSelection}
          onConfirm={confirmarVenta}
        />
      }
      context={
        <POSContextPanel
          selectedCliente={selectedCliente}
          cart={cart}
          total={total}
          message={message}
        />
      }
    />
  );
}
