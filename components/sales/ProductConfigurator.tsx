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
  editingItem,
  flavors,
  toppings,
  getPrice,
  onCancel,
  onAddConfigured,
  onUpdateConfigured,
}: Props) {
  const [flavorSelections, setFlavorSelections] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [serviceFormat, setServiceFormat] = useState<ServiceFormat>("vaso");
  const [includesCookie, setIncludesCookie] = useState(false);
  const [chocolateDip, setChocolateDip] = useState(false);
  const [toppingEnabled, setToppingEnabled] = useState(false);
  const [extraToppingSelections, setExtraToppingSelections] = useState<
    number[]
  >([]);

  const isServedIceCream = useMemo(() => {
    if (!product) return false;

    return (
      product.category?.toLowerCase() === "helados" &&
      product.operational_type?.toLowerCase() === "servido"
    );
  }, [product]);

  useEffect(() => {
    if (editingItem) {
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

    resetConfig();
  }, [product?.id, editingItem?.localId]);

  if (!product) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-400">
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

  const lineTotal = unitPrice + extraUnitPrice;

  function getFormatLabel(format: ServiceFormat) {
    if (format === "ambos") return "vaso + barquillo";
    return format;
  }

  function resetConfig() {
    setFlavorSelections([]);
    setNotes("");
    setServiceFormat("vaso");
    setIncludesCookie(false);
    setChocolateDip(false);
    setToppingEnabled(false);
    setExtraToppingSelections([]);
  }

  function updateFlavorSelection(index: number, value: string) {
    const flavorId = Number(value);

    setFlavorSelections((current) => {
      const next = [...current];
      next[index] = flavorId;
      return next.filter(Boolean);
    });
  }

  function updateExtraToppingSelection(index: number, value: string) {
    const toppingId = Number(value);

    setExtraToppingSelections((current) => {
      const next = [...current];
      next[index] = toppingId;
      return next.filter(Boolean);
    });
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

  function addProduct() {
    if (!product || !canAdd) return;

    const configuredItem: Omit<CartItem, "localId"> = {
      product,
      quantity: 1,
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

            <p className="text-sm font-bold text-violet-700">
              ${unitPrice.toLocaleString("es-CL")}
            </p>
          </div>

          {extraUnitPrice > 0 && (
            <p className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
              +${extraUnitPrice.toLocaleString("es-CL")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg bg-neutral-50 p-2.5">
        <div className="space-y-2">
          {isServedIceCream && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Formato
              </label>

              <select
                value={serviceFormat}
                onChange={(event) => {
                  const value = event.target.value as ServiceFormat;
                  setServiceFormat(value);

                  if (value === "barquillo") {
                    setIncludesCookie(false);
                  }
                }}
                className="mt-1 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white h-9 px-3 text-[13px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="vaso">Vaso</option>
                <option value="barquillo">Barquillo</option>
                <option value="ambos">Vaso + barquillo</option>
              </select>

              {serviceFormat !== "barquillo" && (
                <button
                  type="button"
                  onClick={() => setIncludesCookie((current) => !current)}
                  className={`mt-2 w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] font-bold transition active:scale-[0.98] ${
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
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Sabores
                </label>

                <p className="text-[11px] font-black text-violet-700">
                  {flavorSelections.length}/{product.max_flavors}
                </p>
              </div>

              <div className="space-y-2">
                {Array.from({ length: product.max_flavors }).map(
                  (_item, index) => (
                    <select
                      key={index}
                      value={flavorSelections[index] || ""}
                      onChange={(event) =>
                        updateFlavorSelection(index, event.target.value)
                      }
                      className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white h-9 px-3 text-[13px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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
                  ),
                )}
              </div>
            </div>
          )}

          {isServedIceCream && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Adicionales
              </label>

              <div className="mt-1 grid gap-2">
                <button
                  type="button"
                  onClick={() => setChocolateDip((current) => !current)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] font-bold transition active:scale-[0.98] ${
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
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] font-bold transition active:scale-[0.98] ${
                    toppingEnabled
                      ? "border-violet-300 bg-violet-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  Topping helado +$500
                </button>
              </div>

              {toppingEnabled && (
                <div className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                      Porciones topping
                    </p>

                    <p className="text-[11px] font-black text-violet-700">
                      {extraToppingSelections.length}/2
                    </p>
                  </div>

                  {[0, 1].map((index) => (
                    <select
                      key={index}
                      value={extraToppingSelections[index] || ""}
                      onChange={(event) =>
                        updateExtraToppingSelection(index, event.target.value)
                      }
                      className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-neutral-50 h-9 px-3 text-[13px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="">Topping {index + 1}</option>

                      {toppings.map((topping) => (
                        <option key={topping.id} value={topping.id}>
                          {topping.name}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Nota producto
            </label>

            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: sin barquillo"
              className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>
      </div>

      <div className="mt-2 shrink-0 rounded-lg border border-neutral-200 bg-white p-2.5">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="font-bold text-neutral-600">Total línea</span>

          <span className="text-lg font-black text-violet-700">
            ${lineTotal.toLocaleString("es-CL")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancel}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.98]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={addProduct}
            disabled={!canAdd}
            className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2.5 text-[13px] font-black text-white transition hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingItem ? "Actualizar" : "Agregar"}
          </button>
        </div>
      </div>
    </section>
  );
}
