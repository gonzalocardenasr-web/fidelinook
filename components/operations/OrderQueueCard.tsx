import { QueueOrder } from "../../types/operations";
import OrderElapsedTime from "./OrderElapsedTime";

type Props = {
  order: QueueOrder;
  onAdvance: (order: QueueOrder) => void;
  onCancel: (order: QueueOrder) => void;
  updating: boolean;
};

type ChannelStyle = {
  label: string;
  className: string;
};

function getChannelStyle(channel?: string | null): ChannelStyle {
  const normalized = String(channel || "local").toLowerCase();

  if (normalized === "shopify") {
    return {
      label: "Shopify",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (normalized === "uber" || normalized === "uber_eats") {
    return {
      label: "Uber Eats",
      className: "bg-green-100 text-green-800",
    };
  }

  if (normalized === "rappi") {
    return {
      label: "Rappi",
      className: "bg-orange-100 text-orange-800",
    };
  }

  if (
    normalized === "pedidosya" ||
    normalized === "pedidos_ya" ||
    normalized === "pedidos ya"
  ) {
    return {
      label: "PedidosYa",
      className: "bg-red-100 text-red-800",
    };
  }

  return {
    label: "Local",
    className: "bg-violet-100 text-violet-800",
  };
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Pendiente";
  if (status === "preparing") return "En preparación";
  if (status === "ready") return "Listo";
  if (status === "delivered") return "Entregado";
  if (status === "cancelled") return "Cancelado";

  return status;
}

function getAdvanceLabel(status: string) {
  if (status === "pending") return "Preparar";
  if (status === "preparing") return "Listo";
  if (status === "ready") return "Entregar";

  return "Avanzar";
}

export default function OrderQueueCard({
  order,
  onAdvance,
  onCancel,
  updating,
}: Props) {
  const channel = getChannelStyle(order.sales?.channel);
  const items = order.sales?.sale_items || [];

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm transition duration-150 hover:border-violet-200 hover:shadow-md">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-lg font-black leading-none text-neutral-900">
              {order.display_order_code}
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${channel.className}`}
            >
              {channel.label}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
            <OrderElapsedTime createdAt={order.created_at} />

            <span>·</span>

            <span className="truncate">
              {order.sales?.clientes?.nombre || "Mostrador"}
            </span>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-700">
          {getStatusLabel(order.status)}
        </span>
      </header>

      {order.notes && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold leading-snug text-amber-800">
          {order.notes}
        </p>
      )}

      <div className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-neutral-50">
        {items.map((item) => (
          <div key={item.id} className="px-2.5 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-[12px] font-black text-neutral-900">
                {item.quantity}x {item.product_name}
              </p>
            </div>

            {Array.isArray(item.sale_item_options) &&
              item.sale_item_options.length > 0 && (
                <div className="mt-0.5 text-[11px] leading-snug text-neutral-600">
                  {item.sale_item_options.map((option) => (
                    <span key={option.id} className="mr-1.5">
                      {option.option_value_name}
                    </span>
                  ))}
                </div>
              )}

            {item.notes && (
              <p className="mt-1 text-[11px] font-semibold leading-snug text-amber-800">
                {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <footer className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        {["pending", "preparing", "ready"].includes(order.status) && (
          <button
            type="button"
            onClick={() => onAdvance(order)}
            disabled={updating}
            className="cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-black text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? "Actualizando..." : getAdvanceLabel(order.status)}
          </button>
        )}

        {!["delivered", "cancelled"].includes(order.status) && (
          <button
            type="button"
            onClick={() => onCancel(order)}
            disabled={updating}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </footer>
    </article>
  );
}
