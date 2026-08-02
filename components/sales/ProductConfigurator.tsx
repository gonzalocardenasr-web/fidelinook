import { useMemo, useState } from "react";
import {
  CoffeeOption,
  OptionValue,
  Product,
  ProductCartItem,
} from "../../types/sales";

type Props = {
  product: Product | null;
  editingItem: ProductCartItem | null;
  flavors: OptionValue[];
  brownieVarieties: OptionValue[];
  mineralWaterTypes: OptionValue[];
  coffeeTypes: CoffeeOption[];
  getPrice: (product: Product) => number;
  onCancel: () => void;
  onAddConfigured: (item: Omit<ProductCartItem, "localId">) => void;
  onUpdateConfigured: (
    localId: string,
    item: Omit<ProductCartItem, "localId">,
  ) => void;
};

export default function ProductConfigurator({
  product,
  editingItem,
  flavors,
  brownieVarieties,
  mineralWaterTypes,
  coffeeTypes,
  getPrice,
  onCancel,
  onAddConfigured,
  onUpdateConfigured,
}: Props) {
  /*
   * Este valor se utiliza únicamente para definir el estado inicial.
   * El componente debe recibir una key desde page.tsx para reiniciarse
   * cuando cambia el producto o la línea del carrito que se está editando.
   */
  const initialIsServedIceCream =
    product?.category?.trim().toLowerCase() === "helados" &&
    product?.operational_type?.trim().toLowerCase() === "servido";

  /*
   * Los estados se inicializan directamente desde editingItem.
   * No se utiliza useEffect, evitando actualizaciones de estado
   * síncronas dentro de un efecto.
   */
  const [flavorSelections, setFlavorSelections] = useState<number[]>(
    initialIsServedIceCream ? [] : editingItem?.flavorSelections || [],
  );

  const [brownieVarietyId, setBrownieVarietyId] = useState<number | null>(
    editingItem?.brownieVarietyId ?? null,
  );

  const [mineralWaterTypeId, setMineralWaterTypeId] = useState<number | null>(
    editingItem?.mineralWaterTypeId ?? null,
  );

  const [coffeeTypeId, setCoffeeTypeId] = useState<number | null>(
    editingItem?.coffeeTypeId ?? null,
  );

  const [notes, setNotes] = useState(editingItem?.notes || "");

  const [chocolateDip, setChocolateDip] = useState(
    Boolean(editingItem?.chocolateDip) ||
      Boolean(
        editingItem?.extraLabels?.some(
          (label) => label.toLowerCase() === "baño chocolate",
        ),
      ),
  );

  const [toppingEnabled, setToppingEnabled] = useState(
    Boolean(
      editingItem?.extraLabels?.some((label) =>
        label.toLowerCase().startsWith("topping"),
      ),
    ),
  );

  const isServedIceCream = useMemo(() => {
    if (!product) return false;

    return (
      product.category?.trim().toLowerCase() === "helados" &&
      product.operational_type?.trim().toLowerCase() === "servido"
    );
  }, [product]);

  const requiresBrownieVariety = useMemo(() => {
    const sku = String(product?.sku ?? "")
      .trim()
      .toUpperCase();

    return sku === "BROWNIE" || sku === "BROWNIE-HELADO";
  }, [product]);

  const requiresMineralWaterType = useMemo(() => {
    const sku = String(product?.sku ?? "")
      .trim()
      .toUpperCase();

    return sku === "AGUA-MINERAL-500CC";
  }, [product]);

  const requiresCoffeeType = useMemo(() => {
    const sku = String(product?.sku ?? "")
      .trim()
      .toUpperCase();

    return sku === "CAFE";
  }, [product]);

  const selectedCoffeeType = useMemo(() => {
    if (!coffeeTypeId) {
      return null;
    }

    return (
      coffeeTypes.find((coffeeType) => coffeeType.id === coffeeTypeId) ?? null
    );
  }, [coffeeTypeId, coffeeTypes]);

  if (!product) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-400">
        Selecciona un producto para configurarlo.
      </section>
    );
  }

  /*
   * Los helados servidos no solicitan sabores en caja.
   * Los potes armados y otros productos configurables
   * mantienen su selección de sabores.
   */
  const requiresFlavorSelection =
    !isServedIceCream && product.has_flavors && product.max_flavors > 0;

  const hasRequiredFlavors =
    !requiresFlavorSelection || flavorSelections.length > 0;

  const hasRequiredBrownieVariety =
    !requiresBrownieVariety || Boolean(brownieVarietyId);

  const hasRequiredMineralWaterType =
    !requiresMineralWaterType || Boolean(mineralWaterTypeId);

  const hasRequiredCoffeeType =
    !requiresCoffeeType || Boolean(selectedCoffeeType);

  const canAdd =
    hasRequiredFlavors &&
    hasRequiredBrownieVariety &&
    hasRequiredMineralWaterType &&
    hasRequiredCoffeeType;

  const baseUnitPrice = getPrice(product);

  const coffeeOptionPrice =
    requiresCoffeeType && selectedCoffeeType ? selectedCoffeeType.price : 0;

  const unitPrice = requiresCoffeeType ? coffeeOptionPrice : baseUnitPrice;

  const chocolateDipPrice = isServedIceCream && chocolateDip ? 500 : 0;

  const toppingPrice = isServedIceCream && toppingEnabled ? 500 : 0;

  const extraUnitPrice = chocolateDipPrice + toppingPrice + coffeeOptionPrice;

  const extraLabels = [
    ...(selectedCoffeeType ? [`Tipo: ${selectedCoffeeType.name}`] : []),
    ...(chocolateDip ? ["Baño chocolate"] : []),
    ...(toppingEnabled ? ["Topping"] : []),
  ];

  const lineTotal = baseUnitPrice + extraUnitPrice;

  function resetConfig() {
    setFlavorSelections([]);
    setBrownieVarietyId(null);
    setMineralWaterTypeId(null);
    setCoffeeTypeId(null);
    setNotes("");
    setChocolateDip(false);
    setToppingEnabled(false);
  }

  function updateFlavorSelection(index: number, value: string) {
    setFlavorSelections((current) => {
      const next = [...current];

      if (!value) {
        next[index] = 0;
      } else {
        next[index] = Number(value);
      }

      return next.filter((id) => id > 0);
    });
  }

  function addProduct() {
    if (!product || !canAdd) {
      return;
    }

    const configuredItem: Omit<ProductCartItem, "localId"> = {
      itemType: "product",
      product,
      quantity: 1,

      /*
       * Los helados servidos no registran sabor.
       * Los potes armados y productos configurables sí.
       */
      flavorSelections: isServedIceCream ? [] : flavorSelections,

      toppingIds: [],

      brownieVarietyId: requiresBrownieVariety ? brownieVarietyId : null,

      mineralWaterTypeId: requiresMineralWaterType ? mineralWaterTypeId : null,

      coffeeTypeId: requiresCoffeeType ? coffeeTypeId : null,

      notes: notes.trim(),
      extraUnitPrice,
      extraLabels,

      serviceFormat: undefined,
      includesCookie: false,
      chocolateDip: isServedIceCream && chocolateDip,
      extraToppingSelections: [],

      isGift: editingItem?.isGift ?? false,
      giftReason: editingItem?.giftReason ?? null,
    };

    if (editingItem) {
      onUpdateConfigured(editingItem.localId, configuredItem);
    } else {
      onAddConfigured(configuredItem);
    }

    resetConfig();
    onCancel();
  }

  function cancel() {
    resetConfig();
    onCancel();
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
          Configurar producto
        </p>

        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black leading-tight text-neutral-900">
              {product.name}
            </h2>

            <p className="text-[13px] font-bold text-violet-700">
              ${unitPrice.toLocaleString("es-CL")}
            </p>
          </div>

          {extraUnitPrice > 0 && (
            <p className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-black text-violet-700">
              +${extraUnitPrice.toLocaleString("es-CL")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg bg-neutral-50 p-2.5">
        <div className="space-y-2">
          {requiresBrownieVariety && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Variedad de brownie
              </label>

              <select
                value={brownieVarietyId ?? ""}
                onChange={(event) =>
                  setBrownieVarietyId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Seleccionar variedad</option>

                {brownieVarieties.map((variety) => (
                  <option key={variety.id} value={variety.id}>
                    {variety.name}
                  </option>
                ))}
              </select>

              {brownieVarieties.length === 0 && (
                <p className="mt-1 text-[11px] font-bold text-red-600">
                  No existen variedades con stock disponible.
                </p>
              )}
            </div>
          )}

          {requiresMineralWaterType && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Tipo de agua mineral
              </label>

              <select
                value={mineralWaterTypeId ?? ""}
                onChange={(event) =>
                  setMineralWaterTypeId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Seleccionar tipo</option>

                {mineralWaterTypes.map((waterType) => (
                  <option key={waterType.id} value={waterType.id}>
                    {waterType.name}
                  </option>
                ))}
              </select>

              {mineralWaterTypes.length === 0 && (
                <p className="mt-1 text-[11px] font-bold text-red-600">
                  No existen tipos de agua mineral con stock disponible.
                </p>
              )}
            </div>
          )}

          {requiresCoffeeType && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Tipo de café
              </label>

              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {coffeeTypes.map((coffeeType) => {
                  const selected = coffeeTypeId === coffeeType.id;

                  return (
                    <button
                      key={coffeeType.id}
                      type="button"
                      onClick={() => setCoffeeTypeId(coffeeType.id)}
                      className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left transition active:scale-[0.99] ${
                        selected
                          ? "border-violet-400 bg-violet-600 text-white"
                          : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
                      }`}
                    >
                      <p className="text-[12px] font-black leading-tight">
                        {coffeeType.name}
                      </p>

                      <p
                        className={`mt-0.5 text-[11px] font-bold ${
                          selected ? "text-violet-100" : "text-violet-700"
                        }`}
                      >
                        ${coffeeType.price.toLocaleString("es-CL")}
                      </p>
                    </button>
                  );
                })}
              </div>

              {coffeeTypes.length === 0 && (
                <p className="mt-1 text-[11px] font-bold text-red-600">
                  No existen tipos de café con cápsulas disponibles.
                </p>
              )}
            </div>
          )}

          {requiresFlavorSelection && (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Sabores
                </label>

                <p className="text-[11px] font-black text-violet-700">
                  {flavorSelections.length}/{product.max_flavors}
                </p>
              </div>

              <div className="space-y-2">
                {Array.from({
                  length: product.max_flavors,
                }).map((_item, index) => (
                  <select
                    key={index}
                    value={flavorSelections[index] || ""}
                    onChange={(event) =>
                      updateFlavorSelection(index, event.target.value)
                    }
                    className="h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">
                      {product.max_flavors === 1
                        ? "Seleccionar sabor"
                        : `Sabor ${index + 1}`}
                    </option>

                    {flavors.map((flavor) => (
                      <option key={flavor.id} value={flavor.id}>
                        {flavor.name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          )}

          {isServedIceCream && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Adicionales
              </label>

              <div className="mt-1 grid gap-1.5">
                <button
                  type="button"
                  onClick={() => setChocolateDip((current) => !current)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] font-bold transition active:scale-[0.99] ${
                    chocolateDip
                      ? "border-violet-300 bg-violet-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  Baño de chocolate +$500
                </button>

                <button
                  type="button"
                  onClick={() => setToppingEnabled((current) => !current)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] font-bold transition active:scale-[0.99] ${
                    toppingEnabled
                      ? "border-violet-300 bg-violet-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  Topping +$500
                </button>
              </div>
            </div>
          )}

          {!requiresFlavorSelection &&
            !requiresBrownieVariety &&
            !requiresMineralWaterType &&
            !requiresCoffeeType &&
            !isServedIceCream && (
              <p className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-500">
                Este producto no requiere configuración adicional.
              </p>
            )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Nota producto
            </label>

            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observación opcional"
              className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>
      </div>

      <div className="mt-2 shrink-0 rounded-lg border border-neutral-200 bg-white p-2.5">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="font-bold text-neutral-600">Total línea</span>

          <span className="text-base font-black text-violet-700">
            ${lineTotal.toLocaleString("es-CL")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancel}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.99]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={addProduct}
            disabled={!canAdd}
            className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2.5 text-[13px] font-black text-white transition hover:bg-violet-700 hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingItem ? "Actualizar" : "Agregar"}
          </button>
        </div>
      </div>
    </section>
  );
}
