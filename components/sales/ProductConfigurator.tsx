import { useEffect, useMemo, useState } from "react";
import { Product, OptionValue, CartItem } from "../../types/sales";

type Props = {
  product: Product | null;
  editingItem: CartItem | null;
  flavors: OptionValue[];
  toppings: OptionValue[];
  getPrice: (product: Product) => number;
  onCancel: () => void;
  onAddConfigured: (item: Omit<CartItem, "localId">) => void;
  onUpdateConfigured: (
    localId: string,
    item: Omit<CartItem, "localId">,
  ) => void;
};

type ServiceFormat = "vaso" | "barquillo" | "ambos";

export default function ProductConfigurator({
  product,
  flavors,
  toppings,
  getPrice,
  onCancel,
  onAddConfigured,
  editingItem,
  onUpdateConfigured,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [flavorSelections, setFlavorSelections] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [serviceFormat, setServiceFormat] = useState<ServiceFormat>("vaso");
  const [includesCookie, setIncludesCookie] = useState(false);
  const [chocolateDip, setChocolateDip] = useState(false);
  const [toppingEnabled, setToppingEnabled] = useState(false);
  const [extraToppingSelections, setExtraToppingSelections] = useState<
    number[]
  >([]);

  useEffect(() => {
    if (editingItem) {
      setQuantity(editingItem.quantity);
      setFlavorSelections(editingItem.flavorSelections || []);
      setNotes(
        (editingItem.notes || "")
          .split(" · ")
          .filter((note) => !note.startsWith("Formato:"))
          .filter((note) => note !== "Con galleta")
          .join(" · "),
      );
      setChocolateDip(
        editingItem.extraLabels?.includes("Baño chocolate") || false,
      );

      const toppingLabel = editingItem.extraLabels?.find((label) =>
        label.startsWith("Topping"),
      );

      setToppingEnabled(Boolean(toppingLabel));
      setExtraToppingSelections([]);

      return;
    }

    setQuantity(1);
    setFlavorSelections([]);
    setNotes("");
    setServiceFormat("vaso");
    setIncludesCookie(false);
    setChocolateDip(false);
    setToppingEnabled(false);
    setExtraToppingSelections([]);
  }, [product?.id, editingItem?.localId]);

  const isServedIceCream = useMemo(() => {
    if (!product) return false;

    return (
      product.category?.toLowerCase() === "helados" &&
      product.operational_type?.toLowerCase() === "servido"
    );
  }, [product]);

  if (!product) {
    return (
      <section className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
        Selecciona un producto para configurarlo.
      </section>
    );
  }

  const requiresFlavors = product.has_flavors && product.max_flavors > 0;
  const hasRequiredFlavors = !requiresFlavors || flavorSelections.length > 0;
  const hasRequiredToppings =
    !toppingEnabled || extraToppingSelections.length > 0;
  const canAdd = hasRequiredFlavors && hasRequiredToppings;

  const unitPrice = getPrice(product);

  const toppingExtraPrice =
    isServedIceCream && toppingEnabled && extraToppingSelections.length > 0
      ? 500
      : 0;

  const chocolateDipPrice = isServedIceCream && chocolateDip ? 500 : 0;

  const extraUnitPrice = toppingExtraPrice + chocolateDipPrice;

  const extraLabels = [
    ...(chocolateDip ? ["Baño chocolate"] : []),
    ...(toppingEnabled && extraToppingSelections.length > 0
      ? [
          `Topping (${extraToppingSelections
            .map((id) => toppings.find((topping) => topping.id === id)?.name)
            .filter(Boolean)
            .join(" + ")})`,
        ]
      : []),
  ];

  const lineTotal = (unitPrice + extraUnitPrice) * quantity;

  function getFormatLabel(format: ServiceFormat) {
    if (format === "ambos") return "vaso + barquillo";
    return format;
  }

  function addFlavor(flavorId: number) {
    if (flavorSelections.length >= product.max_flavors) return;
    setFlavorSelections((current) => [...current, flavorId]);
  }

  function removeFlavor(indexToRemove: number) {
    setFlavorSelections((current) =>
      current.filter((_id, index) => index !== indexToRemove),
    );
  }

  function addExtraTopping(toppingId: number) {
    if (extraToppingSelections.length >= 2) return;
    setExtraToppingSelections((current) => [...current, toppingId]);
  }

  function removeExtraTopping(indexToRemove: number) {
    setExtraToppingSelections((current) =>
      current.filter((_id, index) => index !== indexToRemove),
    );
  }

  function buildNotes() {
    const structuredNotes: string[] = [];

    if (isServedIceCream) {
      structuredNotes.push(`Formato: ${getFormatLabel(serviceFormat)}`);

      if (includesCookie && serviceFormat !== "barquillo") {
        structuredNotes.push("Con galleta");
      }
    }

    if (notes.trim()) {
      structuredNotes.push(notes.trim());
    }

    return structuredNotes.join(" · ");
  }

  function resetConfig() {
    setQuantity(1);
    setFlavorSelections([]);
    setNotes("");
    setServiceFormat("vaso");
    setIncludesCookie(false);
    setChocolateDip(false);
    setToppingEnabled(false);
    setExtraToppingSelections([]);
  }

  function addProduct() {
    if (!product || !canAdd) return;

    const configuredItem: Omit<CartItem, "localId"> = {
      product,
      quantity,
      flavorSelections,
      toppingIds: [],
      notes: buildNotes(),
      extraUnitPrice,
      extraLabels,
    };

    if (editingItem) {
      onUpdateConfigured(editingItem.localId, configuredItem);
    } else {
      onAddConfigured(configuredItem);
    }

    resetConfig();
  }

  function cancel() {
    resetConfig();
    onCancel();
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
          Configurar producto
        </p>

        <h2 className="mt-1 text-xl font-black text-neutral-900">
          {product.name}
        </h2>

        <p className="mt-1 text-sm font-bold text-violet-700">
          ${unitPrice.toLocaleString("es-CL")}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-neutral-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Cantidad
          </p>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
              className="h-10 w-10 cursor-pointer rounded-xl border border-neutral-200 bg-white text-lg font-black text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>

            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value) || 1))
              }
              className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-center text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />

            <button
              type="button"
              onClick={() => setQuantity((current) => current + 1)}
              className="h-10 w-10 cursor-pointer rounded-xl border border-neutral-200 bg-white text-lg font-black text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {isServedIceCream && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Formato
            </p>

            <div className="mt-2 grid gap-2">
              {[
                { value: "vaso", label: "Vaso" },
                { value: "barquillo", label: "Barquillo" },
                { value: "ambos", label: "Vaso + barquillo" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setServiceFormat(option.value as ServiceFormat);

                    if (option.value === "barquillo") {
                      setIncludesCookie(false);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${
                    serviceFormat === option.value
                      ? "border-violet-300 bg-violet-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {serviceFormat !== "barquillo" && (
              <button
                type="button"
                onClick={() => setIncludesCookie((current) => !current)}
                className={`mt-2 w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${
                  includesCookie
                    ? "border-amber-300 bg-amber-100 text-amber-800"
                    : "border-neutral-200 bg-white text-neutral-800 hover:bg-amber-50"
                }`}
              >
                {includesCookie ? "Con galleta" : "Agregar galleta"}
              </button>
            )}
          </div>
        )}

        {requiresFlavors && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Sabores
              </p>

              <p className="text-xs font-bold text-violet-700">
                {flavorSelections.length}/{product.max_flavors}
              </p>
            </div>

            {flavorSelections.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {flavorSelections.map((flavorId, index) => {
                  const flavor = flavors.find((item) => item.id === flavorId);

                  return (
                    <button
                      key={`${flavorId}-${index}`}
                      type="button"
                      onClick={() => removeFlavor(index)}
                      className="cursor-pointer rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95"
                    >
                      {flavor?.name || "Sabor"} ×
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 grid gap-2">
              {flavors.map((flavor) => {
                const disabled = flavorSelections.length >= product.max_flavors;

                return (
                  <button
                    key={flavor.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => addFlavor(flavor.id)}
                    className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-sm font-bold text-neutral-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {flavor.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isServedIceCream && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Adicionales
            </p>

            <button
              type="button"
              onClick={() => setChocolateDip((current) => !current)}
              className={`mt-2 w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${
                chocolateDip
                  ? "border-violet-300 bg-violet-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              Baño chocolate +$500
            </button>

            <button
              type="button"
              onClick={() => {
                setToppingEnabled((current) => !current);
                setExtraToppingSelections([]);
              }}
              className={`mt-2 w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${
                toppingEnabled
                  ? "border-violet-300 bg-violet-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              Topping helado +$500
            </button>

            {toppingEnabled && (
              <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-neutral-600">
                    Porciones de topping
                  </p>
                  <p className="text-xs font-bold text-violet-700">
                    {extraToppingSelections.length}/2
                  </p>
                </div>

                {extraToppingSelections.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {extraToppingSelections.map((toppingId, index) => {
                      const topping = toppings.find(
                        (item) => item.id === toppingId,
                      );

                      return (
                        <button
                          key={`${toppingId}-${index}`}
                          type="button"
                          onClick={() => removeExtraTopping(index)}
                          className="cursor-pointer rounded-full bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-95"
                        >
                          {topping?.name || "Topping"} ×
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-2 grid gap-2">
                  {toppings.map((topping) => (
                    <button
                      key={topping.id}
                      type="button"
                      disabled={extraToppingSelections.length >= 2}
                      onClick={() => addExtraTopping(topping.id)}
                      className="cursor-pointer rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs font-bold text-neutral-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {topping.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Nota producto
          </label>

          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ej: sin barquillo"
            className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="mt-4 shrink-0 rounded-2xl border border-neutral-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-bold text-neutral-600">Total línea</span>
          <span className="text-lg font-black text-violet-700">
            ${lineTotal.toLocaleString("es-CL")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancel}
            className="cursor-pointer rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.98]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={addProduct}
            disabled={!canAdd}
            className="cursor-pointer rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      </div>
    </section>
  );
}
