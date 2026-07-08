import { useState } from "react";
import { Product, OptionValue, CartItem } from "../../types/sales";

type Props = {
  product: Product | null;
  flavors: OptionValue[];
  toppings: OptionValue[];
  getPrice: (product: Product) => number;
  onCancel: () => void;
  onAddConfigured: (item: Omit<CartItem, "localId">) => void;
};

export default function ProductConfigurator({
  product,
  flavors,
  toppings,
  getPrice,
  onCancel,
  onAddConfigured,
}: Props) {
  const [flavorSelections, setFlavorSelections] = useState<number[]>([]);

  if (!product) {
    return (
      <section className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
        Selecciona un producto para configurarlo.
      </section>
    );
  }

  const requiresFlavors = product.has_flavors && product.max_flavors > 0;
  const canAdd = !requiresFlavors || flavorSelections.length > 0;

  function addFlavor(flavorId: number) {
    if (!product) return;

    if (flavorSelections.length >= product.max_flavors) return;

    setFlavorSelections((current) => [...current, flavorId]);
  }

  function removeFlavor(indexToRemove: number) {
    setFlavorSelections((current) =>
      current.filter((_id, index) => index !== indexToRemove),
    );
  }

  function addProduct() {
    if (!product || !canAdd) return;

    onAddConfigured({
      product,
      quantity: 1,
      flavorSelections,
      toppingIds: [],
      notes: "",
    });

    setFlavorSelections([]);
  }

  function cancel() {
    setFlavorSelections([]);
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
          ${getPrice(product).toLocaleString("es-CL")}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-neutral-50 p-4">
        {requiresFlavors ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-neutral-500">
            Este producto no requiere configuración adicional.
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
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
    </section>
  );
}
