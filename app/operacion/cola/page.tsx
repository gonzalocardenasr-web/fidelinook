"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OrderQueue from "../../../components/operations/OrderQueue";
import { QueueOrder, OrderStatus } from "../../../types/operations";
import { supabase } from "../../../lib/supabase";

export default function ColaPreparacionPage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const realtimeRefreshTimeoutRef = useRef<number | null>(null);

  const cargarPedidos = useCallback(async () => {
    try {
      const res = await fetch("/api/operacion/orders", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar la cola.");
        return;
      }

      setOrders(data.orders || []);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Error cargando cola.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarPedidos();

    const scheduleRealtimeRefresh = () => {
      if (realtimeRefreshTimeoutRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
        realtimeRefreshTimeoutRef.current = null;
        void cargarPedidos();
      }, 300);
    };

    const channel = supabase
      .channel("nook-preparation-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          scheduleRealtimeRefresh();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Preparation queue Realtime status:", status);
        }
      });

    const fallbackInterval = window.setInterval(() => {
      void cargarPedidos();
    }, 120000);

    return () => {
      window.clearInterval(fallbackInterval);

      if (realtimeRefreshTimeoutRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [cargarPedidos]);

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
    <main className="h-full">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
              Operación
            </p>
            <h1 className="text-lg font-bold text-neutral-950">Preparación</h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Pedidos activos agrupados por estado operativo.
            </p>
          </div>

          <div className="rounded-xl bg-violet-50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
              Pedidos activos
            </p>
            <p className="text-lg font-bold leading-none text-violet-950">
              {orders.length}
            </p>
          </div>
        </header>

        {message && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {message}
          </div>
        )}

        <section className="min-h-0 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
          <OrderQueue
            orders={orders}
            loading={loading}
            onChangeStatus={cambiarEstado}
          />
        </section>
      </div>
    </main>
  );
}
