import ClienteSelector, {
  ClienteSelectorValue,
} from "../client/ClienteSelector";
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
  getPrice: (product: CartItem["product"]) => number;
  onClienteChange: (cliente: ClienteSelectorValue | null) => void;
  onPaymentMethodChange: (value: string) => void;
  onRemoveItem: (localId: string) => void;
  onUpdateItem: (localId: string, patch: Partial<CartItem>) => void;
  onToggleFlavor: (item: CartItem, flavorId: number) => void;
  onToggleTopping: (item: CartItem, toppingId: number) => void;
  onConfirm: () => void;
  onRemoveFlavorSelection: (item: CartItem, selectionIndex: number) => void;
};

export default function OrderBuilder({
  cart,
  flavors,
  toppings,
  selectedCliente,
  paymentMethod,
  total,
  saving,
  getPrice,
  onClienteChange,
  onPaymentMethodChange,
  onRemoveItem,
  onUpdateItem,
  onToggleFlavor,
  onToggleTopping,
  onConfirm,
  onRemoveFlavorSelection,
}: Props) {
  return (
    <aside className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900">Pedido</h2>

      <div className="mt-4">
        <ClienteSelector value={selectedCliente} onChange={onClienteChange} />
      </div>

      <div className="mt-4 space-y-4">
        {cart.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún no hay productos agregados.
          </p>
        ) : (
          cart.map((item) => (
            <OrderItemCard
              key={item.localId}
              item={item}
              flavors={flavors}
              toppings={toppings}
              price={getPrice(item.product)}
              onRemove={onRemoveItem}
              onUpdate={onUpdateItem}
              onToggleFlavor={onToggleFlavor}
              onToggleTopping={onToggleTopping}
              onRemoveFlavorSelection={onRemoveFlavorSelection}
            />
          ))
        )}
      </div>

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <label className="text-sm font-semibold text-neutral-700">
          Medio de pago
        </label>

        <select
          value={paymentMethod}
          onChange={(event) => onPaymentMethodChange(event.target.value)}
          className="mt-2 w-full cursor-pointer rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        >
          <option value="efectivo">Efectivo</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
          <option value="transferencia">Transferencia</option>
          <option value="manual">Manual</option>
        </select>

        <OrderTotals total={total} />

        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || cart.length === 0}
          className="mt-4 w-full cursor-pointer rounded-2xl bg-violet-600 px-5 py-4 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {saving ? "Confirmando..." : "Confirmar venta"}
        </button>
      </div>
    </aside>
  );
}
