import { QueueOrder, OrderStatus } from "../../types/operations";
import OrderElapsedTime from "./OrderElapsedTime";
import OrderStatusBadge from "./OrderStatusBadge";

type Props = {
  order: QueueOrder;
  onChangeStatus: (orderId: number, status: OrderStatus) => void;
};

export default function OrderQueueCard({ order, onChangeStatus }: Props) {
  const nextAction =
    order.status === "pending"
      ? { label: "Preparar", status: "preparing" as OrderStatus }
      : order.status === "preparing"
        ? { label: "Listo", status: "ready" as OrderStatus }
        : order.status === "ready"
          ? { label: "Entregar", status: "delivered" as OrderStatus }
          : null;

  const handleCancel = () => {
    const ok = window.confirm(`¿Cancelar pedido ${order.display_order_code}?`);
    if (!ok) return;
    onChangeStatus(order.id, "cancelled");
  };

  return (
    <article className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-black text-neutral-900">
            {order.display_order_code}
          </p>

          <div className="mt-1 flex flex-col gap-1">
            <OrderElapsedTime createdAt={order.created_at} />

            <p className="text-sm text-neutral-500">
              Cliente: {order.sales?.clientes?.nombre || "Mostrador"}
            </p>
          </div>
        </div>

        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-5 space-y-3">
        {order.sales?.sale_items?.map((item) => (
          <div key={item.id} className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-base font-bold text-neutral-900">
              {item.quantity}x {item.product_name}
            </p>

            {item.sale_item_options && item.sale_item_options.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                {item.sale_item_options.map((option, index) => (
                  <li key={`${item.id}-${index}`}>
                    {option.option_group_code}: {option.option_value_name}
                  </li>
                ))}
              </ul>
            )}

            {item.notes && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                Nota: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        {nextAction && (
          <button
            type="button"
            onClick={() => onChangeStatus(order.id, nextAction.status)}
            className="flex-1 cursor-pointer rounded-2xl bg-violet-600 px-4 py-4 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md active:scale-[0.98]"
          >
            {nextAction.label}
          </button>
        )}

        <button
          type="button"
          onClick={handleCancel}
          className="cursor-pointer rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-bold text-red-700 transition duration-200 hover:bg-red-100 active:scale-[0.98]"
        >
          Cancelar
        </button>
      </div>
    </article>
  );
}
