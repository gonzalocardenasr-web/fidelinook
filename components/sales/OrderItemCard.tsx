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
}: Props) {
  const selectedFlavorNames = item.flavorSelections
    .map((id) => flavors.find((flavor) => flavor.id === id)?.name)
    .filter(Boolean) as string[];

  const selectedToppingNames = item.toppingIds
    .map((id) => toppings.find((topping) => topping.id === id)?.name)
    .filter(Boolean) as string[];

  function formatRepeatedNames(names: string[]) {
    const counts = names.reduce<Record<string, number>>((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
      .join(" + ");
  }

  const lineTotal = (price + (item.extraUnitPrice || 0)) * item.quantity;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-black text-neutral-900">
              {item.quantity}x {item.product.name}
            </p>

            <p className="shrink-0 text-xs font-black text-violet-700">
              ${lineTotal.toLocaleString("es-CL")}
            </p>
          </div>

          <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-neutral-600">
            {selectedFlavorNames.length > 0 && (
              <p>
                <span className="font-bold">Sabores:</span>{" "}
                {formatRepeatedNames(selectedFlavorNames)}
              </p>
            )}

            {selectedToppingNames.length > 0 && (
              <p>
                <span className="font-bold">Toppings:</span>{" "}
                {formatRepeatedNames(selectedToppingNames)}
              </p>
            )}

            {item.extraLabels?.length > 0 && (
              <p>
                <span className="font-bold">Adicionales:</span>{" "}
                {item.extraLabels.join(" + ")}
              </p>
            )}

            {item.notes && (
              <p className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                {item.notes}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.localId)}
          className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-50 active:scale-95"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}
