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
  total: number;
  saving: boolean;
  orderNotes: string;
  clienteSelectorResetKey: number;
  getPrice: (product: CartItem["product"]) => number;
  onClienteChange: (cliente: ClienteSelectorValue | null) => void;
  onPaymentMethodChange: (value: string) => void;
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
  total,
  saving,
  orderNotes,
  getPrice,
  onPaymentMethodChange,
  onRemoveItem,
  onDuplicateItem,
  onReconfigureItem,
  onOrderNotesChange,
  onConfirm,
}: Props) {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

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
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-400">
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
              onUpdate={() => {}}
              onToggleFlavor={() => {}}
              onToggleTopping={() => {}}
              onRemoveFlavorSelection={() => {}}
            />
          ))
        )}
      </div>

      <div className="mt-2 shrink-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Nota pedido
          </label>

          <input
            value={orderNotes}
            onChange={(event) => onOrderNotesChange(event.target.value)}
            placeholder="Ej: cliente espera afuera"
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Medio de pago
          </label>

          <select
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            className="mt-1 w-full cursor-pointer rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          >
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="transferencia">Transferencia</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div className="mt-3">
          <OrderTotals total={total} />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || cart.length === 0}
          className="mt-3 w-full cursor-pointer rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {saving ? "Confirmando..." : "Confirmar venta"}
        </button>
      </div>
    </aside>
  );
}
