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
  portion_quantity: number;
  has_flavors: boolean;
  max_flavors: number;
  allow_repeat_flavor: boolean;
  allows_toppings: boolean;
  max_toppings: number;
  allows_chocolate_dip: boolean;
  requires_preparation: boolean;
  is_active: boolean;
  sort_order: number;
  product_prices?: {
    id: number;
    channel: string;
    price_list: string;
    price: number;
    is_active: boolean;
  }[];
  product_option_prices?: {
    id: number;
    option_value_id: number;
    channel: string;
    price_list: string;
    price: number;
    inventory_quantity: number | string;
    is_active: boolean;
  }[];
  product_channels?: {
    channel_code: string;
    is_enabled: boolean;
  }[];
  product_option_rules?: {
    id: number;
    option_group_id: number;
    min_quantity: number;
    max_quantity: number;
    allow_repeat: boolean;
    is_required: boolean;
  }[];
  inventory_items?: {
    id: number;
    code: string;
    name: string;
    option_value_id: number | null;
    consumption_quantity: number | string;
    unit: string;
    inventory_source: string | null;
    is_active: boolean;
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

type ProductForm = {
  productId: number | null;
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  operationalType: "directo" | "servido" | "preparado";
  portionQuantity: number;
  hasFlavors: boolean;
  maxFlavors: number;
  allowRepeatFlavor: boolean;
  allowsToppings: boolean;
  maxToppings: number;
  allowsChocolateDip: boolean;
  requiresPreparation: boolean;
  structuralOptionGroupId: number | null;
  sortOrder: number;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  productId: null,
  sku: "",
  name: "",
  category: "",
  subcategory: "",
  operationalType: "directo",
  portionQuantity: 0,
  hasFlavors: false,
  maxFlavors: 0,
  allowRepeatFlavor: true,
  allowsToppings: false,
  maxToppings: 0,
  allowsChocolateDip: false,
  requiresPreparation: false,
  structuralOptionGroupId: null,
  sortOrder: 0,
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
  const [newOptionNames, setNewOptionNames] = useState<Record<number, string>>(
    {},
  );
  const [creatingOptionGroupId, setCreatingOptionGroupId] = useState<
    number | null
  >(null);
  const [message, setMessage] = useState("");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productForm, setProductForm] =
    useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingChannelKey, setSavingChannelKey] = useState<string | null>(null);
  const [pricingProduct, setPricingProduct] = useState<Product | null>(null);
  const [pricingValues, setPricingValues] = useState<Record<string, string>>(
    {},
  );
  const [savingPriceChannel, setSavingPriceChannel] = useState<string | null>(
    null,
  );
  const [optionPricingValues, setOptionPricingValues] = useState<
    Record<string, string>
  >({});
  const [savingOptionPriceKey, setSavingOptionPriceKey] = useState<
    string | null
  >(null);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(
    null,
  );
  const [inventoryConsumptionValues, setInventoryConsumptionValues] = useState<
    Record<number, string>
  >({});
  const [savingInventoryItemId, setSavingInventoryItemId] = useState<
    number | null
  >(null);

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

  function abrirNuevoProducto() {
    setProductForm(EMPTY_PRODUCT_FORM);
    setMessage("");
    setProductFormOpen(true);
  }

  function abrirEditarProducto(product: Product) {
    setProductForm({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      operationalType: product.operational_type as
        | "directo"
        | "servido"
        | "preparado",
      portionQuantity: Number(product.portion_quantity || 0),
      hasFlavors: product.has_flavors,
      maxFlavors: Number(product.max_flavors || 0),
      allowRepeatFlavor: product.allow_repeat_flavor,
      allowsToppings: product.allows_toppings,
      maxToppings: Number(product.max_toppings || 0),
      allowsChocolateDip: product.allows_chocolate_dip,
      requiresPreparation: product.requires_preparation,
      structuralOptionGroupId:
        product.product_option_rules?.find((rule) =>
          optionGroups.some(
            (group) =>
              group.id === Number(rule.option_group_id) &&
              ["brownie_variety", "mineral_water_type", "coffee_type"].includes(
                group.code,
              ),
          ),
        )?.option_group_id ?? null,
      sortOrder: Number(product.sort_order || 0),
    });

    setMessage("");
    setProductFormOpen(true);
  }

  function cerrarFormularioProducto() {
    if (savingProduct) return;

    setProductFormOpen(false);
    setProductForm(EMPTY_PRODUCT_FORM);
  }

  async function guardarProducto() {
    try {
      setSavingProduct(true);
      setMessage("");

      const isEditing = productForm.productId !== null;

      const res = await fetch("/api/catalogo/products/manage", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar el producto.");
        return;
      }

      const savedProductId = isEditing
        ? productForm.productId
        : Number(data.product?.id);

      if (!savedProductId) {
        setMessage(
          "El producto fue guardado, pero no fue posible identificarlo para completar su configuración.",
        );
        return;
      }

      const structuralRes = await fetch(
        "/api/catalogo/products/structural-option",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: savedProductId,
            optionGroupId: productForm.structuralOptionGroupId,
          }),
        },
      );

      const structuralData = await structuralRes.json();

      if (!structuralRes.ok) {
        await cargarCatalogo();

        setMessage(
          structuralData.message ||
            "El producto fue guardado, pero no fue posible actualizar su opción estructural.",
        );
        return;
      }

      setProductFormOpen(false);
      setProductForm(EMPTY_PRODUCT_FORM);

      await cargarCatalogo();

      setMessage(
        isEditing
          ? "Producto actualizado correctamente."
          : "Producto creado como inactivo. Completa su configuración antes de activarlo.",
      );
    } catch (error) {
      console.error(error);
      setMessage("Error guardando producto.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function actualizarCanalProducto(
    product: Product,
    channel: SalesChannel,
    isEnabled: boolean,
  ) {
    const key = `${product.id}:${channel.code}`;

    try {
      setSavingChannelKey(key);
      setMessage("");

      const res = await fetch("/api/catalogo/products/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          channelCode: channel.code,
          isEnabled,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo actualizar el canal.");
        return;
      }

      await cargarCatalogo();

      setMessage(
        `${channel.name} ${isEnabled ? "habilitado" : "deshabilitado"} para ${product.name}.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("Error actualizando canal de venta.");
    } finally {
      setSavingChannelKey(null);
    }
  }

  function getChannelPrice(product: Product, channelCode: string) {
    const price = product.product_prices?.find(
      (item) =>
        item.channel === channelCode &&
        item.price_list === "general" &&
        item.is_active,
    );

    return price ? Number(price.price) : null;
  }

  function getCoffeeOptionValues() {
    return (
      optionGroups
        .find((group) => group.code === "coffee_type" && group.is_active)
        ?.catalog_option_values.filter((option) => option.is_active) ?? []
    ).sort((a, b) => a.sort_order - b.sort_order);
  }

  function getProductOptionPrice(
    product: Product,
    optionValueId: number,
    channelCode: string,
  ) {
    const price = product.product_option_prices?.find(
      (item) =>
        Number(item.option_value_id) === optionValueId &&
        item.channel === channelCode &&
        item.price_list === "general" &&
        item.is_active,
    );

    return price ? Number(price.price) : null;
  }

  function abrirInventarioProducto(product: Product) {
    const values: Record<number, string> = {};

    for (const inventoryItem of product.inventory_items ?? []) {
      if (!inventoryItem.is_active) {
        continue;
      }

      values[inventoryItem.id] = String(inventoryItem.consumption_quantity);
    }

    setInventoryConsumptionValues(values);
    setInventoryProduct(product);
    setMessage("");
  }

  function getInventoryOptionName(optionValueId: number | null) {
    if (optionValueId === null) {
      return null;
    }

    for (const group of optionGroups) {
      const optionValue = group.catalog_option_values.find(
        (option) => option.id === optionValueId,
      );

      if (optionValue) {
        return optionValue.name;
      }
    }

    return `Opción #${optionValueId}`;
  }

  async function guardarConsumoInventario(inventoryItemId: number) {
    if (!inventoryProduct) return;

    const rawQuantity =
      inventoryConsumptionValues[inventoryItemId]?.trim() ?? "";

    if (rawQuantity === "") {
      setMessage("Ingresa una cantidad de consumo.");
      return;
    }

    const consumptionQuantity = Number(rawQuantity);

    if (!Number.isFinite(consumptionQuantity) || consumptionQuantity <= 0) {
      setMessage("El consumo debe ser mayor que cero.");
      return;
    }

    try {
      setSavingInventoryItemId(inventoryItemId);
      setMessage("");

      const res = await fetch("/api/catalogo/products/inventory-consumption", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId,
          consumptionQuantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          data.message || "No se pudo actualizar el consumo de inventario.",
        );
        return;
      }

      await cargarCatalogo();

      setInventoryProduct((current) => {
        if (!current) return current;

        return {
          ...current,
          inventory_items: (current.inventory_items ?? []).map((item) =>
            item.id === inventoryItemId
              ? {
                  ...item,
                  consumption_quantity: consumptionQuantity,
                }
              : item,
          ),
        };
      });

      setMessage(
        `Consumo de inventario actualizado para ${inventoryProduct.name}.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("Error actualizando consumo de inventario.");
    } finally {
      setSavingInventoryItemId(null);
    }
  }

  function abrirPreciosProducto(product: Product) {
    const values: Record<string, string> = {};
    const optionValues: Record<string, string> = {};

    for (const channel of salesChannels) {
      const price = getChannelPrice(product, channel.code);
      values[channel.code] = price === null ? "" : String(price);
    }

    for (const optionPrice of product.product_option_prices ?? []) {
      if (optionPrice.price_list !== "general" || !optionPrice.is_active) {
        continue;
      }

      const key = `${optionPrice.option_value_id}:${optionPrice.channel}`;
      optionValues[key] = String(optionPrice.price);
    }

    setPricingValues(values);
    setOptionPricingValues(optionValues);
    setPricingProduct(product);
    setMessage("");
  }

  async function guardarPrecioProducto(channel: SalesChannel) {
    if (!pricingProduct) return;

    const rawPrice = pricingValues[channel.code]?.trim() ?? "";

    if (rawPrice === "") {
      setMessage(`Ingresa un precio para ${channel.name}.`);
      return;
    }

    const price = Number(rawPrice);

    if (!Number.isInteger(price) || price < 0) {
      setMessage(`El precio de ${channel.name} no es válido.`);
      return;
    }

    try {
      setSavingPriceChannel(channel.code);
      setMessage("");

      const res = await fetch("/api/catalogo/products/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pricingProduct.id,
          channelCode: channel.code,
          priceList: "general",
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo actualizar el precio.");
        return;
      }

      await cargarCatalogo();

      setPricingProduct((current) => {
        if (!current) return current;

        return {
          ...current,
          product_prices: [
            ...(current.product_prices ?? []).filter(
              (item) =>
                !(
                  item.channel === channel.code &&
                  item.price_list === "general" &&
                  item.is_active
                ),
            ),
            {
              id: Number(data.priceId),
              channel: channel.code,
              price_list: "general",
              price,
              is_active: true,
            },
          ],
        };
      });

      setMessage(
        `Precio de ${channel.name} actualizado para ${pricingProduct.name}.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("Error actualizando precio.");
    } finally {
      setSavingPriceChannel(null);
    }
  }

  async function guardarPrecioOpcion(
    optionValue: OptionValue,
    channel: SalesChannel,
  ) {
    if (!pricingProduct) return;

    const key = `${optionValue.id}:${channel.code}`;
    const rawPrice = optionPricingValues[key]?.trim() ?? "";

    if (rawPrice === "") {
      setMessage(
        `Ingresa un precio para ${optionValue.name} en ${channel.name}.`,
      );
      return;
    }

    const price = Number(rawPrice);

    if (!Number.isInteger(price) || price < 0) {
      setMessage(
        `El precio de ${optionValue.name} en ${channel.name} no es válido.`,
      );
      return;
    }

    try {
      setSavingOptionPriceKey(key);
      setMessage("");

      const res = await fetch("/api/catalogo/products/option-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pricingProduct.id,
          optionValueId: optionValue.id,
          channelCode: channel.code,
          priceList: "general",
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          data.message || "No se pudo actualizar el precio de la opción.",
        );
        return;
      }

      await cargarCatalogo();

      setPricingProduct((current) => {
        if (!current) return current;

        return {
          ...current,
          product_option_prices: [
            ...(current.product_option_prices ?? []).filter(
              (item) =>
                !(
                  Number(item.option_value_id) === optionValue.id &&
                  item.channel === channel.code &&
                  item.price_list === "general" &&
                  item.is_active
                ),
            ),
            {
              id: Number(data.priceId),
              option_value_id: optionValue.id,
              channel: channel.code,
              price_list: "general",
              price,
              inventory_quantity:
                current.product_option_prices?.find(
                  (item) =>
                    Number(item.option_value_id) === optionValue.id &&
                    item.is_active,
                )?.inventory_quantity ?? 1,
              is_active: true,
            },
          ],
        };
      });

      setMessage(
        `Precio de ${optionValue.name} en ${channel.name} actualizado correctamente.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("Error actualizando precio de opción.");
    } finally {
      setSavingOptionPriceKey(null);
    }
  }

  function getLocalPrice(product: Product) {
    return (
      product.product_prices?.find(
        (price) =>
          price.channel === "local" &&
          price.price_list === "general" &&
          price.is_active,
      )?.price ?? null
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

  async function crearOpcion(group: OptionGroup) {
    const name = (newOptionNames[group.id] || "").trim();

    if (!name) {
      setMessage(`Ingresa un nombre para la nueva opción de ${group.name}.`);
      return;
    }

    try {
      setCreatingOptionGroupId(group.id);
      setMessage("");

      const res = await fetch("/api/catalogo/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo crear la opción.");
        return;
      }

      setNewOptionNames((current) => ({
        ...current,
        [group.id]: "",
      }));

      setMessage("Opción creada correctamente.");
      await cargarCatalogo();
    } catch (error) {
      console.error(error);
      setMessage("Error creando opción.");
    } finally {
      setCreatingOptionGroupId(null);
    }
  }

  const structuralOptionGroups = useMemo(
    () =>
      optionGroups
        .filter(
          (group) =>
            group.is_active &&
            ["brownie_variety", "mineral_water_type", "coffee_type"].includes(
              group.code,
            ),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [optionGroups],
  );

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
    <main className="min-h-screen bg-[#F6F3FF] p-3">
      <div className="w-full space-y-2">
        <header className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-sm">
          <Link
            href="/operacion"
            className="inline-flex shrink-0 items-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 active:scale-[0.98]"
          >
            ← Operación
          </Link>

          <div>
            <h1 className="text-2xl font-black text-neutral-900">
              Catálogo Maestro
            </h1>
            <p className="text-sm text-neutral-500">
              Administra productos, configuración y disponibilidad comercial por
              canal.
            </p>
          </div>
        </header>

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
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-neutral-900">
                    Catálogo Maestro
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {filteredProducts.length} de {products.length} productos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={abrirNuevoProducto}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 active:scale-[0.98]"
                >
                  + Nuevo producto
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[1050px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Clasificación</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Precio local</th>
                      <th className="px-3 py-2">Canales</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2 text-right">Acción</th>
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
                          {getLocalPrice(product) === null
                            ? "Sin precio"
                            : getLocalPrice(product)!.toLocaleString("es-CL", {
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
                              const channelKey = `${product.id}:${channel.code}`;
                              const isSaving = savingChannelKey === channelKey;

                              return (
                                <button
                                  key={channel.code}
                                  type="button"
                                  disabled={isSaving || !channel.is_active}
                                  onClick={() =>
                                    actualizarCanalProducto(
                                      product,
                                      channel,
                                      !enabled,
                                    )
                                  }
                                  title={
                                    !channel.is_active
                                      ? `${channel.name} está inactivo como canal de venta`
                                      : enabled
                                        ? `Deshabilitar ${channel.name}`
                                        : `Habilitar ${channel.name}`
                                  }
                                  className={`cursor-pointer rounded-full px-2 py-1 text-[10px] font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    enabled
                                      ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                                      : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
                                  }`}
                                >
                                  {isSaving ? "Guardando..." : channel.name}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="bg-[#FCF8FF] px-3 py-3">
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

                        <td className="rounded-r-2xl bg-[#FCF8FF] px-3 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirInventarioProducto(product)}
                              className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98]"
                            >
                              Inventario
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirPreciosProducto(product)}
                              className="cursor-pointer rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
                            >
                              Precios
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirEditarProducto(product)}
                              className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 transition hover:border-violet-300 hover:text-violet-700 active:scale-[0.98]"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
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
              {optionGroups
                .filter((group) =>
                  [
                    "flavor",
                    "topping",
                    "brownie_variety",
                    "mineral_water_type",
                    "coffee_type",
                  ].includes(group.code),
                )
                .map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <h2 className="text-xl font-black text-neutral-900">
                      {group.name}
                    </h2>

                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={newOptionNames[group.id] || ""}
                        onChange={(event) =>
                          setNewOptionNames((current) => ({
                            ...current,
                            [group.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            creatingOptionGroupId !== group.id
                          ) {
                            void crearOpcion(group);
                          }
                        }}
                        placeholder={`Nueva opción de ${group.name.toLowerCase()}`}
                        disabled={creatingOptionGroupId === group.id}
                        className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() => void crearOpcion(group)}
                        disabled={
                          creatingOptionGroupId === group.id ||
                          !(newOptionNames[group.id] || "").trim()
                        }
                        className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingOptionGroupId === group.id
                          ? "Agregando..."
                          : "Agregar"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {group.catalog_option_values
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

      {productFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-neutral-900">
                  {productForm.productId ? "Editar producto" : "Nuevo producto"}
                </h2>
                <p className="text-sm text-neutral-500">
                  {productForm.productId
                    ? "Modifica la identidad y configuración base del producto."
                    : "El producto se creará inactivo hasta completar su configuración comercial."}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormularioProducto}
                disabled={savingProduct}
                className="cursor-pointer rounded-xl border border-neutral-200 px-3 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <section className="space-y-4">
                <h3 className="font-black text-neutral-900">
                  Identidad y clasificación
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    SKU
                    <input
                      value={productForm.sku}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          sku: event.target.value.toUpperCase(),
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 font-mono text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>

                  <label className="text-sm font-semibold text-neutral-700">
                    Nombre
                    <input
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>

                  <label className="text-sm font-semibold text-neutral-700">
                    Categoría
                    <input
                      list="catalog-categories"
                      value={productForm.category}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                    <datalist id="catalog-categories">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </label>

                  <label className="text-sm font-semibold text-neutral-700">
                    Subcategoría
                    <input
                      value={productForm.subcategory}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          subcategory: event.target.value,
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>

                  <label className="text-sm font-semibold text-neutral-700">
                    Tipo operacional
                    <select
                      value={productForm.operationalType}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          operationalType: event.target.value as
                            | "directo"
                            | "servido"
                            | "preparado",
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="directo">Directo</option>
                      <option value="servido">Servido</option>
                      <option value="preparado">Preparado</option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-neutral-700">
                    Orden
                    <input
                      type="number"
                      min={0}
                      value={productForm.sortOrder}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          sortOrder: Math.max(
                            0,
                            Number(event.target.value) || 0,
                          ),
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-black text-neutral-900">
                  Configuración operacional
                </h3>

                <label className="block text-sm font-semibold text-neutral-700">
                  Cantidad de porciones
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={productForm.portionQuantity}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        portionQuantity: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </label>

                <div className="rounded-xl border border-neutral-200 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-neutral-800">
                    <input
                      type="checkbox"
                      checked={productForm.hasFlavors}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          hasFlavors: event.target.checked,
                        }))
                      }
                    />
                    Permite selección de sabores
                  </label>

                  {productForm.hasFlavors && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-neutral-700">
                        Máximo de sabores
                        <input
                          type="number"
                          min={0}
                          value={productForm.maxFlavors}
                          onChange={(event) =>
                            setProductForm((current) => ({
                              ...current,
                              maxFlavors: Math.max(
                                0,
                                Number(event.target.value) || 0,
                              ),
                            }))
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm"
                        />
                      </label>

                      <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-neutral-700">
                        <input
                          type="checkbox"
                          checked={productForm.allowRepeatFlavor}
                          onChange={(event) =>
                            setProductForm((current) => ({
                              ...current,
                              allowRepeatFlavor: event.target.checked,
                            }))
                          }
                        />
                        Permitir repetir sabor
                      </label>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-neutral-200 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-neutral-800">
                    <input
                      type="checkbox"
                      checked={productForm.allowsToppings}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          allowsToppings: event.target.checked,
                        }))
                      }
                    />
                    Permite toppings
                  </label>

                  {productForm.allowsToppings && (
                    <label className="mt-3 block text-sm font-semibold text-neutral-700">
                      Máximo de toppings
                      <input
                        type="number"
                        min={0}
                        value={productForm.maxToppings}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            maxToppings: Math.max(
                              0,
                              Number(event.target.value) || 0,
                            ),
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm"
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-xl border border-neutral-200 p-3">
                  <label className="block text-sm font-bold text-neutral-800">
                    Opción estructural
                    <select
                      value={productForm.structuralOptionGroupId ?? ""}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          structuralOptionGroupId: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">Sin opción estructural</option>

                      {structuralOptionGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="mt-2 text-xs text-neutral-500">
                    Cuando se utiliza, el cliente debe seleccionar exactamente
                    una alternativa.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 p-3 text-sm font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={productForm.allowsChocolateDip}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          allowsChocolateDip: event.target.checked,
                        }))
                      }
                    />
                    Permite baño de chocolate
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 p-3 text-sm font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={productForm.requiresPreparation}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          requiresPreparation: event.target.checked,
                        }))
                      }
                    />
                    Requiere preparación
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-200 bg-white px-5 py-4">
              <p className="max-w-2xl text-xs text-neutral-500">
                Precio, canales de venta e integración de inventario se
                administran separadamente. Guardar esta ficha no activa
                automáticamente el producto.
              </p>

              <button
                type="button"
                onClick={guardarProducto}
                disabled={savingProduct}
                className="cursor-pointer rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProduct
                  ? "Guardando..."
                  : productForm.productId
                    ? "Guardar cambios"
                    : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}
      {inventoryProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Integración de inventario
                </p>

                <h2 className="mt-1 text-xl font-black text-neutral-900">
                  {inventoryProduct.name}
                </h2>

                <p className="mt-1 font-mono text-xs text-neutral-500">
                  {inventoryProduct.sku}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInventoryProduct(null)}
                disabled={savingInventoryItemId !== null}
                className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-5">
              {(inventoryProduct.inventory_items ?? []).filter(
                (item) => item.is_active,
              ).length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_150px_160px_100px] gap-3 px-3 text-xs font-bold uppercase tracking-wide text-neutral-500">
                    <span>Ítem de inventario</span>
                    <span>Opción</span>
                    <span>Consumo por unidad</span>
                    <span></span>
                  </div>

                  {(inventoryProduct.inventory_items ?? [])
                    .filter((item) => item.is_active)
                    .sort((a, b) => a.id - b.id)
                    .map((inventoryItem) => {
                      const isSaving =
                        savingInventoryItemId === inventoryItem.id;

                      return (
                        <div
                          key={inventoryItem.id}
                          className="grid grid-cols-[minmax(0,1fr)_150px_160px_100px] items-center gap-3 rounded-xl border border-neutral-200 px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-neutral-900">
                              {inventoryItem.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-neutral-400">
                              {inventoryItem.code}
                            </p>
                          </div>

                          <span className="text-xs font-semibold text-neutral-600">
                            {getInventoryOptionName(
                              inventoryItem.option_value_id,
                            ) ?? "Producto base"}
                          </span>

                          <input
                            type="number"
                            min={0.0001}
                            step="any"
                            value={
                              inventoryConsumptionValues[inventoryItem.id] ?? ""
                            }
                            onChange={(event) =>
                              setInventoryConsumptionValues((current) => ({
                                ...current,
                                [inventoryItem.id]: event.target.value,
                              }))
                            }
                            disabled={isSaving}
                            className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-neutral-50"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              guardarConsumoInventario(inventoryItem.id)
                            }
                            disabled={savingInventoryItemId !== null}
                            className="cursor-pointer rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      );
                    })}

                  <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
                    El consumo indica cuántas unidades de este ítem de
                    inventario descuenta la venta de una unidad del producto u
                    opción. Modificarlo no altera el stock actual ni los
                    precios.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-8 text-center">
                  <p className="text-sm font-bold text-neutral-700">
                    Este producto no tiene ítems de inventario directos
                    configurados.
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Los consumos compuestos o excepcionales se administrarán
                    mediante sus mappings de inventario.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {pricingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                  Pricing multicanal
                </p>

                <h2 className="mt-1 text-xl font-black text-neutral-900">
                  {pricingProduct.name}
                </h2>

                <p className="mt-1 font-mono text-xs text-neutral-500">
                  {pricingProduct.sku}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPricingProduct(null)}
                disabled={
                  savingPriceChannel !== null || savingOptionPriceKey !== null
                }
                className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-5">
              {pricingProduct.sku === "CAFE" ? (
                <div className="space-y-5">
                  {salesChannels.map((channel) => {
                    const enabled = isProductEnabledForChannel(
                      pricingProduct,
                      channel.code,
                    );

                    return (
                      <section
                        key={channel.code}
                        className="overflow-hidden rounded-xl border border-neutral-200"
                      >
                        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                          <div>
                            <p className="font-black text-neutral-900">
                              {channel.name}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              Lista general
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              enabled
                                ? "bg-violet-100 text-violet-700"
                                : "bg-neutral-200 text-neutral-500"
                            }`}
                          >
                            {enabled ? "Habilitado" : "Deshabilitado"}
                          </span>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_150px_170px_100px] gap-3 border-b border-neutral-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                          <span>Tipo</span>
                          <span>Vigente</span>
                          <span>Precio</span>
                          <span></span>
                        </div>

                        {getCoffeeOptionValues().map((optionValue) => {
                          const key = `${optionValue.id}:${channel.code}`;
                          const currentPrice = getProductOptionPrice(
                            pricingProduct,
                            optionValue.id,
                            channel.code,
                          );
                          const isSaving = savingOptionPriceKey === key;

                          return (
                            <div
                              key={optionValue.id}
                              className="grid grid-cols-[minmax(0,1fr)_100px_150px_170px_100px] items-center gap-3 border-b border-neutral-100 px-4 py-2.5 last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-bold text-neutral-900">
                                  {optionValue.name}
                                </p>
                                <p className="font-mono text-[10px] text-neutral-400">
                                  {optionValue.code}
                                </p>
                              </div>

                              <span className="text-xs font-semibold text-neutral-600">
                                {currentPrice === null
                                  ? "Sin precio"
                                  : currentPrice.toLocaleString("es-CL", {
                                      style: "currency",
                                      currency: "CLP",
                                      maximumFractionDigits: 0,
                                    })}
                              </span>

                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={optionPricingValues[key] ?? ""}
                                onChange={(event) =>
                                  setOptionPricingValues((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                disabled={isSaving}
                                placeholder="Sin precio"
                                className="h-9 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-neutral-50"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  guardarPrecioOpcion(optionValue, channel)
                                }
                                disabled={savingOptionPriceKey !== null}
                                className="cursor-pointer rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isSaving ? "Guardando..." : "Guardar"}
                              </button>
                            </div>
                          );
                        })}
                      </section>
                    );
                  })}

                  <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
                    El precio se administra independientemente para cada tipo de
                    café y canal. La configuración operacional de consumo se
                    administra desde Inventario. Un precio puede configurarse
                    antes de habilitar el canal.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_110px_180px_100px] gap-3 px-3 text-xs font-bold uppercase tracking-wide text-neutral-500">
                    <span>Canal</span>
                    <span>Disponibilidad</span>
                    <span>Precio general</span>
                    <span></span>
                  </div>

                  {salesChannels.map((channel) => {
                    const enabled = isProductEnabledForChannel(
                      pricingProduct,
                      channel.code,
                    );
                    const currentPrice = getChannelPrice(
                      pricingProduct,
                      channel.code,
                    );
                    const isSaving = savingPriceChannel === channel.code;

                    return (
                      <div
                        key={channel.code}
                        className="grid grid-cols-[minmax(0,1fr)_110px_180px_100px] items-center gap-3 rounded-xl border border-neutral-200 px-3 py-3"
                      >
                        <div>
                          <p className="font-bold text-neutral-900">
                            {channel.name}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {currentPrice === null
                              ? "Sin precio vigente"
                              : `Vigente: ${currentPrice.toLocaleString(
                                  "es-CL",
                                  {
                                    style: "currency",
                                    currency: "CLP",
                                    maximumFractionDigits: 0,
                                  },
                                )}`}
                          </p>
                        </div>

                        <div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              enabled
                                ? "bg-violet-100 text-violet-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {enabled ? "Habilitado" : "Deshabilitado"}
                          </span>
                        </div>

                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={pricingValues[channel.code] ?? ""}
                          onChange={(event) =>
                            setPricingValues((current) => ({
                              ...current,
                              [channel.code]: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          placeholder="Sin precio"
                          className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-neutral-50"
                        />

                        <button
                          type="button"
                          onClick={() => guardarPrecioProducto(channel)}
                          disabled={savingPriceChannel !== null}
                          className="cursor-pointer rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    );
                  })}

                  <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
                    Un precio puede configurarse antes de habilitar el canal.
                    Cambiar un precio conserva su historial de vigencia; no
                    modifica el estado global del producto ni habilita
                    automáticamente el canal.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
