"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OrderQueue from "../../../components/operations/OrderQueue";
import { QueueOrder, OrderStatus } from "../../../types/operations";

export default function ColaPreparacionPage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    cargarPedidos();

    const interval = window.setInterval(cargarPedidos, 5000);

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

  async function cambiarEstado(orderId: number, newStatus: OrderStatus) {
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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <Link
            href="/operacion"
            className="inline-flex rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition duration-200 hover:bg-white/25 active:scale-[0.98]"
          >
            ← Volver a operación
          </Link>

          <h1 className="mt-3 text-3xl font-bold">Cola de preparación</h1>

          <p className="text-sm opacity-90">
            Pedidos no entregados, agrupados por estado operativo.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        <OrderQueue
          orders={orders}
          loading={loading}
          onChangeStatus={cambiarEstado}
        />
      </div>
    </main>
  );
}
