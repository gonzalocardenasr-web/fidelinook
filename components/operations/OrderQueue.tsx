import { useState } from "react";
import { QueueOrder, OrderStatus } from "../../types/operations";
import OrderQueueCard from "./OrderQueueCard";

type Props = {
  orders: QueueOrder[];
  loading: boolean;
  onChangeStatus: (
    orderId: number,
    status: OrderStatus,
  ) => Promise<void> | void;
};

const columns: { title: string; status: OrderStatus }[] = [
  { title: "Pendientes", status: "pending" },
  { title: "Preparando", status: "preparing" },
  { title: "Listos", status: "ready" },
];

function getNextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "pending") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "ready") return "delivered";

  return null;
}

export default function OrderQueue({ orders, loading, onChangeStatus }: Props) {
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  async function advanceOrder(order: QueueOrder) {
    const nextStatus = getNextStatus(order.status);

    if (!nextStatus) return;

    try {
      setUpdatingOrderId(order.id);
      await onChangeStatus(order.id, nextStatus);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function cancelOrder(order: QueueOrder) {
    try {
      setUpdatingOrderId(order.id);
      await onChangeStatus(order.id, "cancelled");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-600">Cargando pedidos...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-neutral-600 shadow-sm">
        No hay pedidos pendientes.
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-220px)] gap-4 lg:grid-cols-3">
      {columns.map((column) => {
        const filtered = orders.filter(
          (order) => order.status === column.status,
        );

        return (
          <section
            key={column.status}
            className="flex min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white/70 p-3 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-neutral-800">
                {column.title}
              </h2>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-500 shadow-sm">
                {filtered.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-white/60 p-4 text-center text-sm text-neutral-400">
                  Sin pedidos
                </div>
              ) : (
                filtered.map((order) => (
                  <OrderQueueCard
                    key={order.id}
                    order={order}
                    onAdvance={advanceOrder}
                    onCancel={cancelOrder}
                    updating={updatingOrderId === order.id}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
