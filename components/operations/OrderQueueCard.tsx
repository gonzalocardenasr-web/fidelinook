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
  bandClassName: string;
};

type StructuredNotes = {
  format: string | null;
  cookie: boolean;
  additional: string[];
  freeNotes: string[];
};

function getChannelStyle(channel?: string | null): ChannelStyle {
  const normalized = String(channel || "local")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");

  if (normalized === "shopify") {
    return {
      label: "Shopify",
      bandClassName: "bg-blue-100 text-blue-900",
    };
  }

  if (
    normalized === "uber" ||
    normalized === "uber_eats" ||
    normalized === "ubereats"
  ) {
    return {
      label: "Uber Eats",
      bandClassName: "bg-green-100 text-green-900",
    };
  }

  if (normalized === "rappi") {
    return {
      label: "Rappi",
      bandClassName: "bg-orange-100 text-orange-900",
    };
  }

  if (
    normalized === "pedidosya" ||
    normalized === "pedidos_ya" ||
    normalized === "pedidos ya"
  ) {
    return {
      label: "PedidosYa",
      bandClassName: "bg-red-100 text-red-900",
    };
  }

  return {
    label: "Local",
    bandClassName: "bg-violet-100 text-violet-900",
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

function getStatusClassName(status: string) {
  if (status === "pending") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "preparing") {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "ready") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-800";
  }

  return "bg-neutral-100 text-neutral-700";
}

function getAdvanceLabel(status: string) {
  if (status === "pending") return "Preparar";
  if (status === "preparing") return "Listo";
  if (status === "ready") return "Entregar";

  return "Avanzar";
}

function formatRepeatedNames(names: string[]) {
  const counts = names.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
    .join(" + ");
}

function parseStructuredNotes(notes?: string | null): StructuredNotes {
  const result: StructuredNotes = {
    format: null,
    cookie: false,
    additional: [],
    freeNotes: [],
  };

  if (!notes) return result;

  const parts = notes
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const normalized = part.toLowerCase();

    if (normalized.startsWith("formato:")) {
      result.format = part.replace(/^formato:\s*/i, "");
      continue;
    }

    if (normalized === "con galleta") {
      result.cookie = true;
      continue;
    }

    if (
      normalized.startsWith("baño chocolate") ||
      normalized.startsWith("topping")
    ) {
      result.additional.push(part);
      continue;
    }

    result.freeNotes.push(part);
  }

  return result;
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
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition duration-150 hover:border-violet-200 hover:shadow-md">
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 ${channel.bandClassName}`}
      >
        <span className="text-[11px] font-black uppercase tracking-wide">
          {channel.label}
        </span>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getStatusClassName(
            order.status,
          )}`}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="p-2.5">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-black leading-none text-neutral-900">
              {order.display_order_code}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-500">
              <OrderElapsedTime createdAt={order.created_at} />

              <span>·</span>

              <span className="truncate">
                {order.sales?.clientes?.nombre || "Mostrador"}
              </span>
            </div>
          </div>
        </header>

        {order.notes && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold leading-snug text-amber-800">
            {order.notes}
          </p>
        )}

        <div className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50">
          {items.map((item) => {
            const options = Array.isArray(item.sale_item_options)
              ? item.sale_item_options
              : [];

            const flavorNames = options
              .filter(
                (option) =>
                  option.option_group_code === "flavor" ||
                  option.option_group_code === "sabor",
              )
              .map((option) => option.option_value_name)
              .filter(Boolean);

            const regularToppingNames = options
              .filter(
                (option) =>
                  option.option_group_code === "topping" ||
                  option.option_group_code === "toppings",
              )
              .map((option) => option.option_value_name)
              .filter(Boolean);

            const structuredNotes = parseStructuredNotes(item.notes);

            return (
              <div key={item.id} className="px-2.5 py-2">
                <p className="text-[12px] font-black leading-tight text-neutral-900">
                  {item.quantity}x {item.product_name}
                </p>

                <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-neutral-600">
                  {flavorNames.length > 0 && (
                    <p>
                      <span className="font-bold">Sabores:</span>{" "}
                      {formatRepeatedNames(flavorNames)}
                    </p>
                  )}

                  {regularToppingNames.length > 0 && (
                    <p>
                      <span className="font-bold">Toppings:</span>{" "}
                      {formatRepeatedNames(regularToppingNames)}
                    </p>
                  )}

                  {structuredNotes.format && (
                    <p>
                      <span className="font-bold">Formato:</span>{" "}
                      {structuredNotes.format}
                      {structuredNotes.cookie ? " · Con galleta" : ""}
                    </p>
                  )}

                  {!structuredNotes.format && structuredNotes.cookie && (
                    <p>
                      <span className="font-bold">Formato:</span> Con galleta
                    </p>
                  )}

                  {structuredNotes.additional.length > 0 && (
                    <p>
                      <span className="font-bold">Adicionales:</span>{" "}
                      {structuredNotes.additional.join(" + ")}
                    </p>
                  )}
                </div>

                {structuredNotes.freeNotes.length > 0 && (
                  <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-snug text-amber-800">
                    {structuredNotes.freeNotes.join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
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
      </div>
    </article>
  );
}
