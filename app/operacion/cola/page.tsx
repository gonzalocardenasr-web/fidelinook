"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: number;
  display_order_code: string;
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  created_at: string;
  sales?: {
    total: number;
    payment_method: string;
    clientes?: {
      nombre?: string;
    } | null;
    sale_items?: {
      id: number;
      product_name: string;
      quantity: number;
      notes?: string | null;
      sale_item_options?: {
        option_group_code: string;
        option_value_name: string;
        quantity: number;
      }[];
    }[];
  };
};

const statusLabels: Record<Order["status"], string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function ColaPreparacionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    cargarPedidos();

    const interval = window.setInterval(cargarPedidos, 15000);

    return () => window.clearInterval(interval);
  }, []);

  async function cargarPedidos() {
    try {
      const res = await fetch("/api/operacion/orders");
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar la cola.");
        return;
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando cola.");
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(orderId: number, newStatus: Order["status"]) {
    try {
      setMessage("");

      const res = await fetch("/api/operacion/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo actualizar pedido.");
        return;
      }

      await cargarPedidos();
    } catch (error) {
      console.error(error);
      setMessage("Error actualizando pedido.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <Link href="/operacion" className="text-sm font-medium text-white/90">
            ← Volver a operación
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Cola de preparación</h1>
          <p className="text-sm opacity-90">
            Pedidos no entregados, ordenados por hora de ingreso.
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-white px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-neutral-600">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-neutral-600 shadow-sm">
            No hay pedidos pendientes.
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black text-neutral-900">
                      {order.display_order_code}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {new Date(order.created_at).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                    {statusLabels[order.status]}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {order.sales?.sale_items?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-neutral-50 p-3"
                    >
                      <p className="font-semibold text-neutral-900">
                        {item.quantity}x {item.product_name}
                      </p>

                      {item.sale_item_options &&
                        item.sale_item_options.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                            {item.sale_item_options.map((option) => (
                              <li key={`${item.id}-${option.id}`}>
                                {option.option_group_code}:{" "}
                                {option.option_value_name}
                              </li>
                            ))}
                          </ul>
                        )}

                      {item.notes && (
                        <p className="mt-2 text-sm font-medium text-amber-700">
                          Nota: {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => cambiarEstado(order.id, "preparing")}
                      className="rounded-xl bg-black px-3 py-3 text-sm font-bold text-white"
                    >
                      Preparar
                    </button>
                  )}

                  {order.status !== "ready" && (
                    <button
                      onClick={() => cambiarEstado(order.id, "ready")}
                      className="rounded-xl bg-violet-600 px-3 py-3 text-sm font-bold text-white"
                    >
                      Listo
                    </button>
                  )}

                  <button
                    onClick={() => cambiarEstado(order.id, "delivered")}
                    className="rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white"
                  >
                    Entregado
                  </button>

                  <button
                    onClick={() => cambiarEstado(order.id, "cancelled")}
                    className="rounded-xl bg-red-50 px-3 py-3 text-sm font-bold text-red-700"
                  >
                    Cancelar
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
