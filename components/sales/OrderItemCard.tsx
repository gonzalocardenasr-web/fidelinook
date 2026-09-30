import { ProductCartItem, OptionValue } from "../../types/sales";

type Props = {
  item: ProductCartItem;
  flavors: OptionValue[];
  toppings: OptionValue[];
  price: number;
  onRemove: (localId: string) => void;
  onDuplicate: (item: ProductCartItem) => void;
  onUpdate: (localId: string, patch: Partial<ProductCartItem>) => void;
  onToggleFlavor: (item: ProductCartItem, flavorId: number) => void;
  onToggleTopping: (item: ProductCartItem, toppingId: number) => void;
  onRemoveFlavorSelection: (
    item: ProductCartItem,
    selectionIndex: number,
  ) => void;
  onReconfigure: (item: ProductCartItem) => void;
};

const giftReasons = [
  "Cortesía comercial",
  "Promoción",
  "Compensación cliente",
  "NookLovers",
  "Otro",
];

const OTHER_GIFT_REASON = "Otro";
const OTHER_GIFT_REASON_PREFIX = "Otro:";

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

  const isOtherGiftReason =
    item.giftReason === OTHER_GIFT_REASON ||
    item.giftReason?.startsWith(OTHER_GIFT_REASON_PREFIX) === true;

  const isPredefinedGiftReason = giftReasons.includes(item.giftReason ?? "");

  const isReservedGiftReason =
    Boolean(item.giftReason) && !isPredefinedGiftReason && !isOtherGiftReason;

  const giftReasonSelectValue = isOtherGiftReason
    ? OTHER_GIFT_REASON
    : isPredefinedGiftReason
      ? (item.giftReason ?? "")
      : "";

  const otherGiftReasonDetail =
    item.giftReason?.startsWith(OTHER_GIFT_REASON_PREFIX) === true
      ? item.giftReason.slice(OTHER_GIFT_REASON_PREFIX.length).trimStart()
      : "";

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

  function handleGiftReasonChange(value: string) {
    onUpdate(item.localId, {
      giftReason: value || "",
    });
  }

  function handleOtherGiftReasonChange(value: string) {
    onUpdate(item.localId, {
      giftReason: value.trim()
        ? `${OTHER_GIFT_REASON_PREFIX} ${value}`
        : OTHER_GIFT_REASON,
    });
  }

  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 ${
        item.isGift
          ? "border-emerald-300 bg-emerald-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-[13px] font-black text-neutral-900">
          {item.quantity}x {item.product.name}
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onReconfigure(item)}
            title="Editar producto"
            aria-label="Editar producto"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800 active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(item)}
            title="Duplicar producto"
            aria-label="Duplicar producto"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-violet-600 transition hover:bg-violet-100 hover:text-violet-800 active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="11" height="11" rx="2" />
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleGift}
            title={item.isGift ? "Quitar regalo" : "Marcar como regalo"}
            aria-label={item.isGift ? "Quitar regalo" : "Marcar como regalo"}
            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition active:scale-95 ${
              item.isGift
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                : "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7Zm0 0h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            title="Quitar producto"
            aria-label="Quitar producto"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 11v5M14 11v5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="ml-1 shrink-0 text-right">
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
            className={`text-[13px] font-black ${
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

      {item.isGift && !isReservedGiftReason && (
        <div className="mt-1.5 space-y-1.5">
          <select
            value={giftReasonSelectValue}
            onChange={(event) => handleGiftReasonChange(event.target.value)}
            className={`h-7 w-full cursor-pointer rounded-lg border bg-white px-2 text-[10px] font-bold outline-none ${
              item.giftReason && item.giftReason !== OTHER_GIFT_REASON
                ? "border-emerald-300"
                : "border-red-300"
            }`}
          >
            <option value="">Motivo del regalo</option>

            {giftReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>

          {isOtherGiftReason && (
            <input
              type="text"
              value={otherGiftReasonDetail}
              onChange={(event) =>
                handleOtherGiftReasonChange(event.target.value)
              }
              placeholder="Especifica el motivo"
              autoFocus
              className={`h-7 w-full rounded-lg border bg-white px-2 text-[10px] font-semibold outline-none transition focus:ring-2 ${
                otherGiftReasonDetail.trim()
                  ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                  : "border-red-300 focus:border-red-400 focus:ring-red-100"
              }`}
            />
          )}
        </div>
      )}

      {item.isGift && isReservedGiftReason && (
        <div className="mt-1.5 rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-[10px] font-bold text-emerald-800">
          Motivo: {item.giftReason}
        </div>
      )}
    </div>
  );
}
