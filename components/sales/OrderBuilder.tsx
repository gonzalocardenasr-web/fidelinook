import { ClienteSelectorValue } from "../client/ClienteSelector";
import {
  CartItem,
  OptionValue,
  Product,
  ProductCartItem,
} from "../../types/sales";
import OrderItemCard from "./OrderItemCard";
import OrderTotals from "./OrderTotals";
import { useState } from "react";

type ManualDiscountType = "percent" | "fixed";

type ManualDiscountReason =
  | "courtesy"
  | "complaint"
  | "agreement"
  | "exceptional_promotion"
  | "service_error"
  | "other";

type Props = {
  cart: CartItem[];
  flavors: OptionValue[];
  toppings: OptionValue[];
  selectedCliente: ClienteSelectorValue | null;
  paymentMethod: string;
  cashReceived: string;
  subtotal: number;
  potQuantity: number;
  discountRate: number;
  potDiscountTotal: number;
  giftDiscountTotal: number;
  discountTotal: number;
  total: number;
  saving: boolean;
  orderNotes: string;
  clienteSelectorResetKey: number;
  manualDiscountEnabled: boolean;
  manualDiscountType: ManualDiscountType;
  manualDiscountValue: string;
  manualDiscountReason: ManualDiscountReason | "";
  manualDiscountNotes: string;
  manualDiscountAmount: number;
  totalBeforeManualDiscount: number;
  getPrice: (product: Product) => number;
  onClienteChange: (cliente: ClienteSelectorValue | null) => void;
  onPaymentMethodChange: (value: string) => void;
  onCashReceivedChange: (value: string) => void;
  onManualDiscountEnabledChange: (value: boolean) => void;
  onManualDiscountTypeChange: (value: ManualDiscountType) => void;
  onManualDiscountValueChange: (value: string) => void;
  onManualDiscountReasonChange: (value: ManualDiscountReason | "") => void;
  onManualDiscountNotesChange: (value: string) => void;
  onRemoveItem: (localId: string) => void;
  onDuplicateItem: (item: ProductCartItem) => void;
  onReconfigureItem: (item: ProductCartItem) => void;
  onUpdateItem: (localId: string, patch: Partial<CartItem>) => void;
  onToggleFlavor: (item: ProductCartItem, flavorId: number) => void;
  onToggleTopping: (item: ProductCartItem, toppingId: number) => void;
  onRemoveFlavorSelection: (
    item: ProductCartItem,
    selectionIndex: number,
  ) => void;
  onOrderNotesChange: (value: string) => void;
  onConfirm: () => void;
  onAddCustomItem: (item: {
    customName: string;
    customUnitPrice: number;
    quantity: number;
  }) => void;
};

export default function OrderBuilder({
  cart,
  flavors,
  toppings,
  paymentMethod,
  cashReceived,
  subtotal,
  potQuantity,
  discountRate,
  potDiscountTotal,
  giftDiscountTotal,
  discountTotal,
  total,
  saving,
  orderNotes,
  manualDiscountEnabled,
  manualDiscountType,
  manualDiscountValue,
  manualDiscountReason,
  manualDiscountNotes,
  manualDiscountAmount,
  totalBeforeManualDiscount,
  getPrice,
  onPaymentMethodChange,
  onCashReceivedChange,
  onManualDiscountEnabledChange,
  onManualDiscountTypeChange,
  onManualDiscountValueChange,
  onManualDiscountReasonChange,
  onManualDiscountNotesChange,
  onRemoveItem,
  onDuplicateItem,
  onReconfigureItem,
  onUpdateItem,
  onToggleFlavor,
  onToggleTopping,
  onRemoveFlavorSelection,
  onOrderNotesChange,
  onConfirm,
  onAddCustomItem,
}: Props) {
  const [customName, setCustomName] = useState("");
  const [customUnitPrice, setCustomUnitPrice] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [customItemError, setCustomItemError] = useState("");

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  function submitCustomItem() {
    const normalizedName = customName.trim();
    const parsedUnitPrice = Number(customUnitPrice);
    const parsedQuantity = Number(customQuantity);

    if (!normalizedName) {
      setCustomItemError("Ingresa un nombre para el ítem.");
      return;
    }

    if (!Number.isInteger(parsedUnitPrice) || parsedUnitPrice <= 0) {
      setCustomItemError("Ingresa un precio entero mayor que cero.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setCustomItemError("Ingresa una cantidad entera mayor que cero.");
      return;
    }

    onAddCustomItem({
      customName: normalizedName,
      customUnitPrice: parsedUnitPrice,
      quantity: parsedQuantity,
    });

    setCustomName("");
    setCustomUnitPrice("");
    setCustomQuantity("1");
    setCustomItemError("");
  }

  const parsedCashReceived =
    cashReceived.trim() === "" ? 0 : Number(cashReceived);

  const hasValidCashAmount =
    Number.isFinite(parsedCashReceived) && parsedCashReceived >= 0;

  const cashIsInsufficient =
    paymentMethod === "efectivo" &&
    total > 0 &&
    (!cashReceived.trim() || !hasValidCashAmount || parsedCashReceived < total);

  const cashChange =
    paymentMethod === "efectivo" &&
    hasValidCashAmount &&
    parsedCashReceived >= total
      ? parsedCashReceived - total
      : 0;

  const parsedManualDiscountValue =
    manualDiscountValue.trim() === "" ? 0 : Number(manualDiscountValue);

  const manualDiscountValueInvalid =
    manualDiscountEnabled &&
    (!Number.isInteger(parsedManualDiscountValue) ||
      parsedManualDiscountValue <= 0 ||
      (manualDiscountType === "percent" && parsedManualDiscountValue > 100) ||
      (manualDiscountType === "fixed" &&
        parsedManualDiscountValue > totalBeforeManualDiscount));

  const manualDiscountReasonInvalid =
    manualDiscountEnabled && !manualDiscountReason;

  const manualDiscountNotesInvalid =
    manualDiscountEnabled &&
    manualDiscountReason === "other" &&
    !manualDiscountNotes.trim();

  const manualDiscountInvalid =
    manualDiscountValueInvalid ||
    manualDiscountReasonInvalid ||
    manualDiscountNotesInvalid;

  const confirmDisabled =
    saving || cart.length === 0 || cashIsInsufficient || manualDiscountInvalid;

  function updateCashReceived(value: string) {
    onCashReceivedChange(value.replace(/\D/g, ""));
  }

  function updateManualDiscountValue(value: string) {
    onManualDiscountValueChange(value.replace(/\D/g, ""));
  }

  function setQuickCashAmount(amount: number) {
    onCashReceivedChange(String(amount));
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
        <div>
          <h2 className="text-[12px] font-black uppercase tracking-wide text-neutral-500">
            Pedido
          </h2>
          <p className="text-[10px] text-neutral-400">
            {totalItems} producto{totalItems === 1 ? "" : "s"}
          </p>
        </div>

        <p className="text-[13px] font-black text-violet-700">
          ${total.toLocaleString("es-CL")}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-400">
            Aún no hay líneas agregadas.
          </div>
        ) : (
          cart.map((item) => {
            if (item.itemType === "custom") {
              const lineTotal = item.customUnitPrice * item.quantity;

              return (
                <div
                  key={item.localId}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2"
                >
                  <div className="flex items-baseline gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-black text-neutral-900">
                        {item.customName}
                      </p>

                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                        Ítem personalizado
                      </p>
                    </div>

                    <div className="shrink-0 text-right leading-tight">
                      <p className="text-[12px] font-black text-violet-700">
                        ${lineTotal.toLocaleString("es-CL")}
                      </p>

                      <p className="text-[9px] text-neutral-500">
                        ${item.customUnitPrice.toLocaleString("es-CL")} c/u
                      </p>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                        Cantidad
                      </span>

                      <div className="flex items-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            onUpdateItem(item.localId, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="flex h-7 w-7 cursor-pointer items-center justify-center border-r border-neutral-200 text-[12px] font-black text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>

                        <span className="flex h-7 min-w-8 items-center justify-center px-1 text-[11px] font-black text-neutral-800">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateItem(item.localId, {
                              quantity: item.quantity + 1,
                            })
                          }
                          className="flex h-7 w-7 cursor-pointer items-center justify-center border-l border-neutral-200 text-[12px] font-black text-neutral-600 transition hover:bg-neutral-50"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.localId)}
                      className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-red-600 transition hover:bg-red-50 active:scale-95"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <OrderItemCard
                key={item.localId}
                item={item}
                flavors={flavors}
                toppings={toppings}
                price={getPrice(item.product)}
                onRemove={onRemoveItem}
                onDuplicate={onDuplicateItem}
                onReconfigure={onReconfigureItem}
                onUpdate={onUpdateItem}
                onToggleFlavor={onToggleFlavor}
                onToggleTopping={onToggleTopping}
                onRemoveFlavorSelection={onRemoveFlavorSelection}
              />
            );
          })
        )}
      </div>

      <div className="mt-1.5 flex max-h-[68%] shrink-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="min-h-0 overflow-y-auto p-2">
          <details className="mb-2 rounded-lg border border-amber-200 bg-amber-50">
            <summary className="cursor-pointer list-none px-2.5 py-2 text-[11px] font-black text-amber-800">
              + Agregar ítem personalizado
            </summary>

            <div className="space-y-2 border-t border-amber-200 px-2.5 pb-2.5 pt-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Nombre
                </label>

                <input
                  value={customName}
                  onChange={(event) => {
                    setCustomName(event.target.value);
                    setCustomItemError("");
                  }}
                  placeholder="Ej: Despacho"
                  maxLength={120}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="grid grid-cols-[1fr_82px] gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    Precio unitario
                  </label>

                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-neutral-500">
                      $
                    </span>

                    <input
                      value={customUnitPrice}
                      onChange={(event) => {
                        setCustomUnitPrice(
                          event.target.value.replace(/\D/g, ""),
                        );
                        setCustomItemError("");
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-7 pr-2.5 text-[12px] font-black outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    Cantidad
                  </label>

                  <input
                    value={customQuantity}
                    onChange={(event) => {
                      setCustomQuantity(event.target.value.replace(/\D/g, ""));
                      setCustomItemError("");
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="1"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-center text-[12px] font-black outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              {customItemError && (
                <p className="text-[11px] font-bold text-red-600">
                  {customItemError}
                </p>
              )}

              <button
                type="button"
                onClick={submitCustomItem}
                className="w-full cursor-pointer rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-amber-700 active:scale-[0.99]"
              >
                Agregar al pedido
              </button>
            </div>
          </details>

          <details
            open={Boolean(orderNotes.trim())}
            className="rounded-lg border border-neutral-200 bg-neutral-50"
          >
            <summary className="cursor-pointer list-none px-2.5 py-2 text-[11px] font-bold text-neutral-600">
              {orderNotes.trim() ? "Nota agregada" : "+ Agregar nota"}
            </summary>

            <div className="border-t border-neutral-200 px-2.5 pb-2.5 pt-2">
              <input
                value={orderNotes}
                onChange={(event) => onOrderNotesChange(event.target.value)}
                placeholder="Ej: cliente espera afuera"
                className="w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </details>

          <div className="mt-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Medio de pago
            </label>
            <select
              value={paymentMethod}
              onChange={(event) => onPaymentMethodChange(event.target.value)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {paymentMethod === "efectivo" && (
            <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Monto recibido
              </label>

              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-neutral-500">
                  $
                </span>
                <input
                  value={cashReceived}
                  onChange={(event) => updateCashReceived(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  className={`w-full rounded-lg border bg-white py-1.5 pl-7 pr-2.5 text-[12px] font-black outline-none transition focus:ring-2 ${
                    cashIsInsufficient && cashReceived.trim()
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-neutral-200 focus:border-violet-400 focus:ring-violet-100"
                  }`}
                />
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[10000, 20000, 50000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setQuickCashAmount(amount)}
                    className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-1 py-1.5 text-[10px] font-black text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
                  >
                    ${(amount / 1000).toLocaleString("es-CL")} mil
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setQuickCashAmount(total)}
                  className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-1 py-1.5 text-[10px] font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 active:scale-[0.98]"
                >
                  Exacto
                </button>
              </div>

              {cashIsInsufficient && (
                <p className="mt-2 text-[11px] font-bold text-red-600">
                  Ingresa un monto recibido igual o superior a $
                  {total.toLocaleString("es-CL")}.
                </p>
              )}

              <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Vuelto
                </span>
                <span
                  className={`text-[13px] font-black ${
                    cashChange > 0 ? "text-emerald-700" : "text-neutral-700"
                  }`}
                >
                  ${cashChange.toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          )}

          <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Descuento manual
              </span>

              <input
                type="checkbox"
                checked={manualDiscountEnabled}
                onChange={(event) =>
                  onManualDiscountEnabledChange(event.target.checked)
                }
                className="h-5 w-5 cursor-pointer accent-violet-600"
              />
            </label>

            {manualDiscountEnabled && (
              <div className="mt-2 space-y-2 border-t border-neutral-200 pt-2">
                <div className="grid grid-cols-[92px_1fr] gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                      Tipo
                    </label>

                    <div className="mt-1 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => onManualDiscountTypeChange("percent")}
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-black transition ${
                          manualDiscountType === "percent"
                            ? "border-violet-400 bg-violet-100 text-violet-700"
                            : "border-neutral-200 bg-white text-neutral-600"
                        }`}
                      >
                        %
                      </button>

                      <button
                        type="button"
                        onClick={() => onManualDiscountTypeChange("fixed")}
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-black transition ${
                          manualDiscountType === "fixed"
                            ? "border-violet-400 bg-violet-100 text-violet-700"
                            : "border-neutral-200 bg-white text-neutral-600"
                        }`}
                      >
                        $
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                      Valor
                    </label>

                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-neutral-500">
                        {manualDiscountType === "percent" ? "%" : "$"}
                      </span>

                      <input
                        value={manualDiscountValue}
                        onChange={(event) =>
                          updateManualDiscountValue(event.target.value)
                        }
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        className={`w-full rounded-lg border bg-white py-1.5 pl-7 pr-2.5 text-[12px] font-black outline-none transition focus:ring-2 ${
                          manualDiscountValueInvalid
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-neutral-200 focus:border-violet-400 focus:ring-violet-100"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    Motivo
                  </label>

                  <select
                    value={manualDiscountReason}
                    onChange={(event) =>
                      onManualDiscountReasonChange(
                        event.target.value as ManualDiscountReason | "",
                      )
                    }
                    className={`mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-[12px] outline-none transition focus:ring-2 ${
                      manualDiscountReasonInvalid
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-neutral-200 focus:border-violet-400 focus:ring-violet-100"
                    }`}
                  >
                    <option value="">Seleccionar motivo</option>
                    <option value="courtesy">Cortesía comercial</option>
                    <option value="complaint">Reclamo cliente</option>
                    <option value="agreement">Convenio</option>
                    <option value="exceptional_promotion">
                      Promoción excepcional
                    </option>
                    <option value="service_error">Error en atención</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                {manualDiscountReason === "other" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                      Especificar motivo
                    </label>

                    <input
                      value={manualDiscountNotes}
                      onChange={(event) =>
                        onManualDiscountNotesChange(event.target.value)
                      }
                      placeholder="Describe el motivo"
                      className={`mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-[12px] outline-none transition focus:ring-2 ${
                        manualDiscountNotesInvalid
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-neutral-200 focus:border-violet-400 focus:ring-violet-100"
                      }`}
                    />
                  </div>
                )}

                {manualDiscountValueInvalid && (
                  <p className="text-[11px] font-bold text-red-600">
                    {manualDiscountType === "percent"
                      ? "Ingresa un porcentaje entero entre 1 y 100."
                      : `Ingresa un monto entre $1 y $${totalBeforeManualDiscount.toLocaleString(
                          "es-CL",
                        )}.`}
                  </p>
                )}

                {manualDiscountReasonInvalid && (
                  <p className="text-[11px] font-bold text-red-600">
                    Selecciona el motivo del descuento.
                  </p>
                )}

                {manualDiscountNotesInvalid && (
                  <p className="text-[11px] font-bold text-red-600">
                    Debes especificar el motivo.
                  </p>
                )}

                {!manualDiscountInvalid && manualDiscountAmount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-violet-100 px-3 py-2">
                    <span className="text-xs font-bold text-violet-700">
                      Descuento
                    </span>

                    <span className="text-sm font-black text-violet-700">
                      -${manualDiscountAmount.toLocaleString("es-CL")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-white p-2">
          <OrderTotals
            subtotal={subtotal}
            potQuantity={potQuantity}
            discountRate={discountRate}
            potDiscountTotal={potDiscountTotal}
            giftDiscountTotal={giftDiscountTotal}
            manualDiscountAmount={manualDiscountAmount}
            discountTotal={discountTotal}
            total={total}
          />

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="mt-1.5 w-full cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-black text-white transition duration-150 hover:bg-violet-700 hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Confirmando..." : "Confirmar venta"}
          </button>
        </div>
      </div>
    </aside>
  );
}
