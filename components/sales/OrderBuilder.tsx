import { ClienteSelectorValue } from "../client/ClienteSelector";
import { CartItem, OptionValue } from "../../types/sales";
import OrderItemCard from "./OrderItemCard";
import OrderTotals from "./OrderTotals";

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
  getPrice: (product: CartItem["product"]) => number;
  onClienteChange: (cliente: ClienteSelectorValue | null) => void;
  onPaymentMethodChange: (value: string) => void;
  onCashReceivedChange: (value: string) => void;
  onRemoveItem: (localId: string) => void;
  onDuplicateItem: (item: CartItem) => void;
  onReconfigureItem: (item: CartItem) => void;
  onUpdateItem: (localId: string, patch: Partial<CartItem>) => void;
  onToggleFlavor: (item: CartItem, flavorId: number) => void;
  onToggleTopping: (item: CartItem, toppingId: number) => void;
  onRemoveFlavorSelection: (item: CartItem, selectionIndex: number) => void;
  onOrderNotesChange: (value: string) => void;
  onConfirm: () => void;
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
  getPrice,
  onPaymentMethodChange,
  onCashReceivedChange,
  onRemoveItem,
  onDuplicateItem,
  onReconfigureItem,
  onUpdateItem,
  onToggleFlavor,
  onToggleTopping,
  onRemoveFlavorSelection,
  onOrderNotesChange,
  onConfirm,
}: Props) {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

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

  const confirmDisabled = saving || cart.length === 0 || cashIsInsufficient;

  function updateCashReceived(value: string) {
    const normalizedValue = value.replace(/\D/g, "");
    onCashReceivedChange(normalizedValue);
  }

  function setQuickCashAmount(amount: number) {
    onCashReceivedChange(String(amount));
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Pedido
          </h2>

          <p className="text-xs text-neutral-400">
            {totalItems} producto{totalItems === 1 ? "" : "s"}
          </p>
        </div>

        <p className="text-sm font-black text-violet-700">
          ${total.toLocaleString("es-CL")}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-400">
            Aún no hay productos agregados.
          </div>
        ) : (
          cart.map((item) => (
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
          ))
        )}
      </div>

      <div className="mt-2 shrink-0 rounded-lg border border-neutral-200 bg-white p-2.5 shadow-sm">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Nota pedido
          </label>

          <input
            value={orderNotes}
            onChange={(event) => onOrderNotesChange(event.target.value)}
            placeholder="Ej: cliente espera afuera"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Medio de pago
          </label>

          <select
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            className="mt-1 w-full cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="transferencia">Transferencia</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {paymentMethod === "efectivo" && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
            <div>
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
                  className={`w-full rounded-lg border bg-white py-2 pl-7 pr-3 text-sm font-black outline-none transition focus:ring-2 ${
                    cashIsInsufficient && cashReceived.trim()
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-neutral-200 focus:border-violet-400 focus:ring-violet-100"
                  }`}
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[10000, 20000, 50000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setQuickCashAmount(amount)}
                  className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-1.5 py-2 text-[11px] font-black text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
                >
                  ${(amount / 1000).toLocaleString("es-CL")} mil
                </button>
              ))}

              <button
                type="button"
                onClick={() => setQuickCashAmount(total)}
                className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-1.5 py-2 text-[11px] font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 active:scale-[0.98]"
              >
                Exacto
              </button>
            </div>

            {cashIsInsufficient && cashReceived.trim() && (
              <p className="mt-2 text-[11px] font-bold text-red-600">
                El monto recibido es inferior al total.
              </p>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Vuelto
              </span>

              <span
                className={`text-base font-black ${
                  cashChange > 0 ? "text-emerald-700" : "text-neutral-700"
                }`}
              >
                ${cashChange.toLocaleString("es-CL")}
              </span>
            </div>
          </div>
        )}

        <div className="mt-3">
          <OrderTotals
            subtotal={subtotal}
            potQuantity={potQuantity}
            discountRate={discountRate}
            potDiscountTotal={potDiscountTotal}
            giftDiscountTotal={giftDiscountTotal}
            discountTotal={discountTotal}
            total={total}
          />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="mt-2.5 w-full cursor-pointer rounded-lg bg-violet-600 px-4 py-2.5 text-[13px] font-black text-white transition duration-150 hover:bg-violet-700 hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Confirmando..." : "Confirmar venta"}
        </button>
      </div>
    </aside>
  );
}
