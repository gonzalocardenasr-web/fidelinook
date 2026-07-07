import { CartItem, OptionValue } from "../../types/sales";

type Props = {
  item: CartItem;
  flavors: OptionValue[];
  toppings: OptionValue[];
  price: number;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, patch: Partial<CartItem>) => void;
  onToggleFlavor: (item: CartItem, flavorId: number) => void;
  onToggleTopping: (item: CartItem, toppingId: number) => void;
  onRemoveFlavorSelection: (item: CartItem, selectionIndex: number) => void;
};

export default function OrderItemCard({
  item,
  flavors,
  toppings,
  price,
  onRemove,
  onUpdate,
  onToggleFlavor,
  onToggleTopping,
  onRemoveFlavorSelection,
}: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-900">{item.product.name}</p>
          <p className="text-sm text-neutral-600">
            ${price.toLocaleString("es-CL")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.localId)}
          className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:scale-95"
        >
          Quitar
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs font-semibold text-neutral-600">
          Cantidad
        </label>

        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(event) =>
            onUpdate(item.localId, {
              quantity: Math.max(1, Number(event.target.value) || 1),
            })
          }
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      {item.product.has_flavors && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-neutral-600">
            Sabores ({item.flavorSelections.length}/{item.product.max_flavors})
          </p>

          {item.flavorSelections.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.flavorSelections.map((flavorId, index) => {
                const flavor = flavors.find(
                  (itemFlavor) => itemFlavor.id === flavorId,
                );

                return (
                  <button
                    key={`${item.localId}-${flavorId}-${index}`}
                    type="button"
                    onClick={() => onRemoveFlavorSelection(item, index)}
                    className="cursor-pointer rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-700 active:scale-95"
                    title="Quitar sabor"
                  >
                    {flavor?.name || "Sabor"} ×
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            {flavors.map((flavor) => {
              const disabled =
                item.flavorSelections.length >= item.product.max_flavors;

              return (
                <button
                  key={flavor.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleFlavor(item, flavor.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                    item.flavorSelections.includes(flavor.id)
                      ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
                      : "bg-white text-neutral-700 hover:bg-violet-50"
                  }`}
                >
                  {flavor.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item.product.allows_toppings && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-neutral-600">
            Toppings ({item.toppingIds.length}/{item.product.max_toppings})
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {toppings.map((topping) => (
              <button
                key={topping.id}
                type="button"
                onClick={() => onToggleTopping(item, topping.id)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition duration-200 active:scale-95 ${
                  item.toppingIds.includes(topping.id)
                    ? "bg-black text-white hover:bg-neutral-800"
                    : "bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {topping.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <label className="text-xs font-semibold text-neutral-600">Nota</label>

        <input
          value={item.notes}
          onChange={(event) =>
            onUpdate(item.localId, { notes: event.target.value })
          }
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          placeholder="Ej: sin barquillo"
        />
      </div>
    </div>
  );
}
