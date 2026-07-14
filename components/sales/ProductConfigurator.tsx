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

export default function ProductConfigurator({
  product,
  editingItem,
  flavors,
  getPrice,
  onCancel,
  onAddConfigured,
  onUpdateConfigured,
}: Props) {
  const [flavorSelections, setFlavorSelections] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [chocolateDip, setChocolateDip] = useState(false);
  const [toppingEnabled, setToppingEnabled] = useState(false);

  const isServedIceCream = useMemo(() => {
    if (!product) return false;

    return (
      product.category?.trim().toLowerCase() === "helados" &&
      product.operational_type?.trim().toLowerCase() === "servido"
    );
  }, [product]);

  useEffect(() => {
    if (editingItem) {
      setFlavorSelections(
        isServedIceCream ? [] : editingItem.flavorSelections || [],
      );

      setNotes(editingItem.notes || "");

      setChocolateDip(
        Boolean(editingItem.chocolateDip) ||
          Boolean(
            editingItem.extraLabels?.some(
              (label) => label.toLowerCase() === "baño chocolate",
            ),
          ),
      );

      setToppingEnabled(
        Boolean(
          editingItem.extraLabels?.some((label) =>
            label.toLowerCase().startsWith("topping"),
          ),
        ),
      );

      return;
    }

    resetConfig();
  }, [product?.id, editingItem?.localId, isServedIceCream]);

  if (!product) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-400">
        Selecciona un producto para configurarlo.
      </section>
    );
  }

  /*
   * Los helados servidos ya no solicitan sabores en caja.
   * Los demás productos configurables, como los potes armados,
   * mantienen su selección de sabores.
   */
  const requiresFlavorSelection =
    !isServedIceCream && product.has_flavors && product.max_flavors > 0;

  const hasRequiredFlavors =
    !requiresFlavorSelection || flavorSelections.length > 0;

  const canAdd = hasRequiredFlavors;

  const unitPrice = getPrice(product);
  const chocolateDipPrice = isServedIceCream && chocolateDip ? 500 : 0;
  const toppingPrice = isServedIceCream && toppingEnabled ? 500 : 0;
  const extraUnitPrice = chocolateDipPrice + toppingPrice;

  const extraLabels = [
    ...(chocolateDip ? ["Baño chocolate"] : []),
    ...(toppingEnabled ? ["Topping"] : []),
  ];

  const lineTotal = unitPrice + extraUnitPrice;

  function resetConfig() {
    setFlavorSelections([]);
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
    if (!product || !canAdd) return;

    const configuredItem: Omit<CartItem, "localId"> = {
      product,
      quantity: 1,

      /*
       * En helados servidos no se registra sabor.
       * En potes armados y otros productos configurables sí.
       */
      flavorSelections: isServedIceCream ? [] : flavorSelections,

      toppingIds: [],
      notes: notes.trim(),
      extraUnitPrice,
      extraLabels,

      /*
       * Se mantienen los campos estructurados para compatibilidad,
       * pero no se capturan formato, galleta ni detalle de topping
       * en helados servidos.
       */
      serviceFormat: undefined,
      includesCookie: false,
      chocolateDip: isServedIceCream && chocolateDip,
      extraToppingSelections: [],
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
                {Array.from({ length: product.max_flavors }).map(
                  (_item, index) => (
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

          {!requiresFlavorSelection && !isServedIceCream && (
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
