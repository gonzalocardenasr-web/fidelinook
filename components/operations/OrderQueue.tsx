import { QueueOrder, OrderStatus } from "../../types/operations";
import OrderQueueCard from "./OrderQueueCard";

type Props = {
  orders: QueueOrder[];
  loading: boolean;
  onChangeStatus: (orderId: number, status: OrderStatus) => void;
};

const sections: { title: string; status: OrderStatus }[] = [
  { title: "Pendientes", status: "pending" },
  { title: "En preparación", status: "preparing" },
  { title: "Listos para entregar", status: "ready" },
];

export default function OrderQueue({ orders, loading, onChangeStatus }: Props) {
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
    <div className="space-y-8">
      {sections.map((section) => {
        const filtered = orders.filter(
          (order) => order.status === section.status,
        );

        if (filtered.length === 0) return null;

        return (
          <section key={section.status}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-neutral-900">
                {section.title}
              </h2>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-500">
                {filtered.length}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((order) => (
                <OrderQueueCard
                  key={order.id}
                  order={order}
                  onChangeStatus={onChangeStatus}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
