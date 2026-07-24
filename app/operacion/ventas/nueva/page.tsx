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
import ProductConfigurator from "../../../../components/sales/ProductConfigurator";
import { SalesChannel } from "../../../../components/pos/SalesChannelSelector";
import CustomMessagePrintModal from "../../../../components/pos/CustomMessagePrintModal";

export default function NuevaVentaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [clienteSelectorResetKey, setClienteSelectorResetKey] = useState(0);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [channel, setChannel] = useState<SalesChannel>("local");
  const [externalOrderId, setExternalOrderId] = useState("");

  const [selectedCliente, setSelectedCliente] =
    useState<ClienteSelectorValue | null>(null);

  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(
    null,
  );

  const [customMessageModalOpen, setCustomMessageModalOpen] = useState(false);

  const [promotionalStamps, setPromotionalStamps] = useState(0);

  const [openBatchFlavorIds, setOpenBatchFlavorIds] = useState<number[]>([]);

  const [readyPotFlavorIds, setReadyPotFlavorIds] = useState<number[]>([]);

  const [availableBrownieVarietyIds, setAvailableBrownieVarietyIds] = useState<
    number[]
  >([]);

  const [availableMineralWaterTypeIds, setAvailableMineralWaterTypeIds] =
    useState<number[]>([]);

  useEffect(() => {
    if (!selectedCliente) {
      setPromotionalStamps(0);
    }
  }, [selectedCliente]);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  useEffect(() => {
    if (channel === "local") {
      setPaymentMethod("efectivo");
    } else {
      setPaymentMethod("manual");
    }
  }, [channel]);

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
      setOpenBatchFlavorIds(data.openBatchFlavorIds || []);
      setReadyPotFlavorIds(data.readyPotFlavorIds || []);
      setAvailableBrownieVarietyIds(data.availableBrownieVarietyIds || []);
      setAvailableMineralWaterTypeIds(data.availableMineralWaterTypeIds || []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando catálogo.");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const sku = product.sku?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";
      const operationalType = product.operational_type?.toLowerCase() || "";
      const subcategory = product.subcategory?.toLowerCase() || "";

      return (
        name.includes(search) ||
        sku.includes(search) ||
        category.includes(search) ||
        operationalType.includes(search) ||
        subcategory.includes(search)
      );
    });
  }, [products, productSearch]);

  const flavors = useMemo(() => {
    return (
      optionGroups.find((group) => group.code === "flavor")
        ?.catalog_option_values || []
    )
      .filter((option) => option.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [optionGroups]);

  const openBatchFlavors = useMemo(() => {
    const availableFlavorIds = new Set(openBatchFlavorIds);

    return flavors.filter((flavor) => availableFlavorIds.has(flavor.id));
  }, [flavors, openBatchFlavorIds]);

  const readyPotFlavors = useMemo(() => {
    const availableFlavorIds = new Set(readyPotFlavorIds);

    return flavors.filter((flavor) => availableFlavorIds.has(flavor.id));
  }, [flavors, readyPotFlavorIds]);

  const brownieVarieties = useMemo(() => {
    const availableIds = new Set(availableBrownieVarietyIds);

    return (
      optionGroups.find((group) => group.code === "brownie_variety")
        ?.catalog_option_values || []
    )
      .filter((option) => option.is_active && availableIds.has(option.id))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [optionGroups, availableBrownieVarietyIds]);

  const mineralWaterTypes = useMemo(() => {
    const availableIds = new Set(availableMineralWaterTypeIds);

    return (
      optionGroups.find((group) => group.code === "mineral_water_type")
        ?.catalog_option_values || []
    )
      .filter((option) => option.is_active && availableIds.has(option.id))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [optionGroups, availableMineralWaterTypeIds]);

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
    setConfiguringProduct(product);
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

  const potSkus = new Set(["POT-16-LISTO", "POT-16-ARMADO"]);

  const pricing = cart.reduce(
    (acc, item) => {
      const unitPrice = getPrice(item.product) + (item.extraUnitPrice || 0);

      const lineTotal = unitPrice * item.quantity;

      acc.subtotal += lineTotal;

      if (item.isGift) {
        acc.giftDiscountTotal += lineTotal;
      }

      if (!item.isGift && potSkus.has(item.product.sku)) {
        acc.potQuantity += item.quantity;
        acc.potSubtotal += lineTotal;
      }

      return acc;
    },
    {
      subtotal: 0,
      potQuantity: 0,
      potSubtotal: 0,
      giftDiscountTotal: 0,
    },
  );

  const discountRate =
    pricing.potQuantity >= 6 ? 0.15 : pricing.potQuantity >= 4 ? 0.1 : 0;

  const potDiscountTotal = Math.round(pricing.potSubtotal * discountRate);

  const discountTotal = potDiscountTotal + pricing.giftDiscountTotal;

  const total = Math.max(0, pricing.subtotal - discountTotal);

  function validarVenta() {
    if (cart.length === 0) {
      return "Agrega al menos un producto.";
    }

    if (channel !== "local" && !externalOrderId.trim()) {
      return "Ingresa el número externo del pedido digital.";
    }

    if (
      !Number.isInteger(promotionalStamps) ||
      promotionalStamps < 0 ||
      promotionalStamps > 5
    ) {
      return "La cantidad de sellos promocionales no es válida.";
    }

    if (promotionalStamps > 0 && !selectedCliente) {
      return "Selecciona un cliente para asignar sellos promocionales.";
    }

    for (const item of cart) {
      if (item.isGift && !item.giftReason?.trim()) {
        return `Debes indicar el motivo del regalo para ${item.product.name}.`;
      }
      const isServedIceCream =
        item.product.category?.trim().toLowerCase() === "helados" &&
        item.product.operational_type?.trim().toLowerCase() === "servido";

      /*
       * Los helados servidos no requieren sabor en caja.
       * Los potes armados y demás productos configurables sí.
       */
      const requiresBrownieVariety =
        item.product.sku === "BROWNIE" || item.product.sku === "BROWNIE-HELADO";

      if (
        requiresBrownieVariety &&
        (!Number.isInteger(item.brownieVarietyId) ||
          Number(item.brownieVarietyId) <= 0)
      ) {
        return `Debes seleccionar una variedad para ${item.product.name}.`;
      }

      if (
        !isServedIceCream &&
        item.product.has_flavors &&
        item.flavorSelections.length === 0
      ) {
        return `Debes seleccionar sabor para ${item.product.name}.`;
      }

      if (
        !isServedIceCream &&
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

      const requiresMineralWaterType =
        item.product.sku === "AGUA-MINERAL-500CC";

      if (
        requiresMineralWaterType &&
        (!Number.isInteger(item.mineralWaterTypeId) ||
          Number(item.mineralWaterTypeId) <= 0)
      ) {
        return `Debes seleccionar el tipo para ${item.product.name}.`;
      }
    }

    return null;
  }

  function getCartItemSignature(item: Omit<CartItem, "localId">) {
    return JSON.stringify({
      productId: item.product.id,

      flavorSelections: [...(item.flavorSelections || [])].sort(
        (a, b) => a - b,
      ),

      toppingIds: [...(item.toppingIds || [])].sort((a, b) => a - b),

      brownieVarietyId: item.brownieVarietyId ?? null,

      serviceFormat: item.serviceFormat || null,

      includesCookie: Boolean(item.includesCookie),

      chocolateDip: Boolean(item.chocolateDip),

      extraToppingSelections: [...(item.extraToppingSelections || [])].sort(
        (a, b) => a - b,
      ),

      notes: item.notes?.trim() || "",

      extraUnitPrice: item.extraUnitPrice || 0,

      mineralWaterTypeId: item.mineralWaterTypeId ?? null,

      isGift: Boolean(item.isGift),
      giftReason: item.giftReason?.trim() || null,
    });
  }

  function addConfiguredProduct(item: Omit<CartItem, "localId">) {
    const newSignature = getCartItemSignature(item);

    setCart((current) => {
      const existingIndex = current.findIndex(
        (cartItem) => getCartItemSignature(cartItem) === newSignature,
      );

      if (existingIndex === -1) {
        return [
          ...current,
          {
            ...item,
            localId: `${item.product.id}-${Date.now()}-${Math.random()}`,
          },
        ];
      }

      return current.map((cartItem, index) =>
        index === existingIndex
          ? {
              ...cartItem,
              quantity: cartItem.quantity + item.quantity,
            }
          : cartItem,
      );
    });

    setEditingItem(null);
    setConfiguringProduct(null);
  }

  function imprimirVentaEnSegundoPlano(saleId: number) {
    const iframe = window.document.createElement("iframe");

    const printId = `nook-print-${saleId}-${Date.now()}`;

    iframe.id = printId;
    iframe.title = "Impresión Nook";
    iframe.setAttribute("aria-hidden", "true");

    iframe.src = `/operacion/ventas/imprimir-pack/${saleId}` + "?autoPrint=1";

    /*
     * No usamos display:none porque algunos navegadores no
     * imprimen el contenido de elementos completamente ocultos.
     */
    Object.assign(iframe.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "80mm",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });

    let cleaned = false;

    function cleanup() {
      if (cleaned) return;

      cleaned = true;

      window.clearTimeout(cleanupTimeout);

      window.removeEventListener("message", handlePrintMessage);

      iframe.remove();
    }

    function handlePrintMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.data?.type === "NOOK_PRINT_COMPLETED" &&
        Number(event.data?.saleId) === saleId
      ) {
        /*
         * Damos un margen breve después del diálogo para evitar
         * retirar el iframe antes de que el driver finalice.
         */
        window.setTimeout(cleanup, 500);
      }
    }

    window.addEventListener("message", handlePrintMessage);

    /*
     * Contingencia: si el navegador no emite afterprint,
     * el iframe se elimina igualmente después de un minuto.
     */
    const cleanupTimeout = window.setTimeout(cleanup, 60000);

    window.document.body.appendChild(iframe);
  }

  async function confirmarVenta() {
    if (saving) {
      return;
    }
    const error = validarVenta();

    if (error) {
      setMessage(error);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        channel,
        externalOrderId: channel === "local" ? null : externalOrderId.trim(),
        paymentMethod,
        orderNotes: orderNotes.trim() || null,
        customerId: selectedCliente?.id ?? null,
        promotionalStamps,
        promotionReason: promotionalStamps > 0 ? "Promoción RRSS" : null,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          is_gift: Boolean(item.isGift),
          gift_reason: item.isGift ? item.giftReason?.trim() || null : null,
          extra_unit_price: item.extraUnitPrice || 0,
          notes: [
            item.serviceFormat
              ? `Formato: ${
                  item.serviceFormat === "ambos"
                    ? "vaso + barquillo"
                    : item.serviceFormat
                }`
              : null,
            item.includesCookie ? "Con galleta" : null,
            ...(item.extraLabels || []),
            item.notes?.trim() || null,
          ]
            .filter(Boolean)
            .join(" · "),
          options: [
            ...item.flavorSelections.map((id) => ({
              option_group_code: "flavor",
              option_value_id: id,
              quantity: 1,
            })),

            ...(item.brownieVarietyId
              ? [
                  {
                    option_group_code: "brownie_variety",
                    option_value_id: item.brownieVarietyId,
                    quantity: 1,
                  },
                ]
              : []),

            ...(item.mineralWaterTypeId
              ? [
                  {
                    option_group_code: "mineral_water_type",
                    option_value_id: item.mineralWaterTypeId,
                    quantity: 1,
                  },
                ]
              : []),

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

      const createdSaleId = Number(data.saleId);

      if (!Number.isInteger(createdSaleId) || createdSaleId <= 0) {
        setMessage(
          "La venta fue creada, pero no se pudo identificar para imprimir.",
        );

        return;
      }

      const displayOrderCode =
        data.result?.display_order_code ||
        data.result?.order?.display_order_code ||
        `Pedido creado`;

      imprimirVentaEnSegundoPlano(createdSaleId);

      setCart([]);
      setOrderNotes("");
      setSelectedCliente(null);
      setChannel("local");
      setExternalOrderId("");
      setClienteSelectorResetKey((current) => current + 1);
      setPromotionalStamps(0);

      const warnings = Array.isArray(data.warnings)
        ? data.warnings.filter(
            (warning: unknown) => typeof warning === "string" && warning.trim(),
          )
        : [];

      setMessage(
        warnings.length > 0
          ? `Venta creada correctamente. Pedido ${displayOrderCode}. ` +
              `Preparando impresión. Advertencia: ${warnings.join(" ")}`
          : `Venta creada correctamente. Pedido ${displayOrderCode}. ` +
              "Preparando impresión.",
      );
    } catch (error) {
      console.error(error);

      setMessage("Error inesperado al confirmar venta.");
    } finally {
      setSaving(false);
    }
  }

  function duplicateItem(item: CartItem) {
    setCart((current) =>
      current.map((cartItem) =>
        cartItem.localId === item.localId
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem,
      ),
    );
  }

  function reconfigureItem(item: CartItem) {
    setEditingItem(item);
    setConfiguringProduct(item.product);
  }

  function updateConfiguredProduct(
    localId: string,
    updatedItem: Omit<CartItem, "localId">,
  ) {
    const updatedSignature = getCartItemSignature(updatedItem);

    setCart((current) => {
      const itemBeingEdited = current.find((item) => item.localId === localId);

      if (!itemBeingEdited) return current;

      const matchingItem = current.find(
        (item) =>
          item.localId !== localId &&
          getCartItemSignature(item) === updatedSignature,
      );

      if (!matchingItem) {
        return current.map((item) =>
          item.localId === localId
            ? {
                ...updatedItem,
                localId,
              }
            : item,
        );
      }

      return current
        .filter((item) => item.localId !== localId)
        .map((item) =>
          item.localId === matchingItem.localId
            ? {
                ...item,
                quantity: item.quantity + updatedItem.quantity,
              }
            : item,
        );
    });

    setEditingItem(null);
    setConfiguringProduct(null);
  }

  return (
    <>
      <POSLayout
        title={channel === "local" ? "Venta local" : "Pedido digital"}
        subtitle={
          channel === "local"
            ? "POS Operacional Nook"
            : "Ingreso manual multicanal"
        }
        center={
          <div
            className={
              configuringProduct
                ? "grid h-full min-h-0 grid-cols-[minmax(280px,0.85fr)_minmax(360px,1.15fr)] gap-2"
                : "grid h-full min-h-0 grid-cols-1 gap-2"
            }
          >
            <ProductGrid
              products={filteredProducts}
              loading={loading}
              getPrice={getPrice}
              onAdd={addProduct}
              search={productSearch}
              onSearchChange={setProductSearch}
              compact={Boolean(configuringProduct)}
            />

            {configuringProduct && (
              <ProductConfigurator
                key={`${configuringProduct.id}-${editingItem?.localId ?? "new"}`}
                product={configuringProduct}
                editingItem={editingItem}
                flavors={
                  configuringProduct?.sku === "POT-16-ARMADO" ||
                  configuringProduct?.sku === "BROWNIE-HELADO"
                    ? openBatchFlavors
                    : configuringProduct?.sku === "POT-16-LISTO"
                      ? readyPotFlavors
                      : flavors
                }
                brownieVarieties={brownieVarieties}
                mineralWaterTypes={mineralWaterTypes}
                getPrice={getPrice}
                onCancel={() => {
                  setConfiguringProduct(null);
                  setEditingItem(null);
                }}
                onAddConfigured={addConfiguredProduct}
                onUpdateConfigured={updateConfiguredProduct}
              />
            )}
          </div>
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
            subtotal={pricing.subtotal}
            potQuantity={pricing.potQuantity}
            discountRate={discountRate}
            potDiscountTotal={potDiscountTotal}
            giftDiscountTotal={pricing.giftDiscountTotal}
            discountTotal={discountTotal}
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
            onDuplicateItem={duplicateItem}
            onReconfigureItem={reconfigureItem}
          />
        }
        context={
          <POSContextPanel
            selectedCliente={selectedCliente}
            cart={cart}
            total={total}
            message={message}
            onClienteChange={setSelectedCliente}
            clienteSelectorResetKey={clienteSelectorResetKey}
            channel={channel}
            externalOrderId={externalOrderId}
            onChannelChange={setChannel}
            onExternalOrderIdChange={setExternalOrderId}
            onOpenCustomMessage={() => setCustomMessageModalOpen(true)}
            promotionalStamps={promotionalStamps}
            onPromotionalStampsChange={setPromotionalStamps}
          />
        }
      />

      <CustomMessagePrintModal
        open={customMessageModalOpen}
        onClose={() => setCustomMessageModalOpen(false)}
      />
    </>
  );
}
