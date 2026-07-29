import { CartItem, OptionValue } from "../../types/sales";

type Props = {
  item: CartItem;
  flavors: OptionValue[];
  toppings: OptionValue[];
  price: number;
  onRemove: (localId: string) => void;
  onDuplicate: (item: CartItem) => void;
  onUpdate: (localId: string, patch: Partial<CartItem>) => void;
  onToggleFlavor: (item: CartItem, flavorId: number) => void;
  onToggleTopping: (item: CartItem, toppingId: number) => void;
  onRemoveFlavorSelection: (item: CartItem, selectionIndex: number) => void;
  onReconfigure: (item: CartItem) => void;
};

const giftReasons = [
  "Atención comercial",
  "Compensación cliente",
  "Promoción",
  "Error operacional",
  "Otro",
];

export default function OrderItemCard({
  item,
  flavors,
  toppings,
  price,
  onRemove,
  onDuplicate,
  onUpdate,
  onReconfigure,
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
      .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name))
      .join(" + ");
  }

  const listLineTotal = (price + (item.extraUnitPrice || 0)) * item.quantity;
  const finalLineTotal = item.isGift ? 0 : listLineTotal;

  function getServiceFormatLabel() {
    if (!item.serviceFormat) return null;

    if (item.serviceFormat === "ambos") {
      return "Vaso + barquillo";
    }

    return (
      item.serviceFormat.charAt(0).toUpperCase() + item.serviceFormat.slice(1)
    );
  }

  function toggleGift() {
    if (item.isGift) {
      onUpdate(item.localId, {
        isGift: false,
        giftReason: null,
      });

      return;
    }

    onUpdate(item.localId, {
      isGift: true,
      giftReason: "",
    });
  }

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        item.isGift
          ? "border-emerald-300 bg-emerald-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 truncate text-[12px] font-black text-neutral-900">
          {item.quantity}x {item.product.name}
        </p>

        <div className="shrink-0 text-right">
          {item.isGift && (
            <span className="mr-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
              Regalo
            </span>
          )}

          {item.isGift && (
            <span className="mr-1 text-[9px] font-semibold text-neutral-400 line-through">
              ${listLineTotal.toLocaleString("es-CL")}
            </span>
          )}

          <span
            className={`text-[12px] font-black ${
              item.isGift ? "text-emerald-700" : "text-violet-700"
            }`}
          >
            ${finalLineTotal.toLocaleString("es-CL")}
          </span>
        </div>
      </div>

      <div className="mt-0.5 space-y-0.5 text-[10px] leading-snug text-neutral-600">
        {selectedFlavorNames.length > 0 && (
          <p>
            <span className="font-bold">Sabores:</span>{" "}
            {formatRepeatedNames(selectedFlavorNames)}
          </p>
        )}

        {item.serviceFormat && (
          <p>
            <span className="font-bold">Formato:</span>{" "}
            {getServiceFormatLabel()}
            {item.includesCookie ? " · Con galleta" : ""}
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
          <p className="rounded-md bg-amber-50 px-1.5 py-1 text-[10px] font-semibold text-amber-800">
            {item.notes}
          </p>
        )}
      </div>

      {item.isGift && (
        <div className="mt-1.5">
          <select
            value={item.giftReason ?? ""}
            onChange={(event) =>
              onUpdate(item.localId, {
                giftReason: event.target.value || "",
              })
            }
            className={`h-7 w-full cursor-pointer rounded-lg border bg-white px-2 text-[10px] font-bold outline-none ${
              item.giftReason ? "border-emerald-300" : "border-red-300"
            }`}
          >
            <option value="">Motivo del regalo</option>

            {giftReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-1 border-t border-neutral-200 pt-1.5">
        <button
          type="button"
          onClick={() => onReconfigure(item)}
          className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-neutral-700 transition hover:bg-neutral-100 active:scale-95"
        >
          Editar
        </button>

        <span className="text-neutral-300">·</span>

        <button
          type="button"
          onClick={() => onDuplicate(item)}
          className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-violet-700 transition hover:bg-violet-50 active:scale-95"
        >
          Duplicar
        </button>

        <span className="text-neutral-300">·</span>

        <button
          type="button"
          onClick={toggleGift}
          className={`cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold transition active:scale-95 ${
            item.isGift
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          {item.isGift ? "Quitar regalo" : "Regalo"}
        </button>

        <span className="text-neutral-300">·</span>

        <button
          type="button"
          onClick={() => onRemove(item.localId)}
          className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-red-600 transition hover:bg-red-50 active:scale-95"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}
