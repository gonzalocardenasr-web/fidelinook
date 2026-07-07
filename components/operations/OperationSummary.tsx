"use client";

import { useEffect, useState } from "react";

type Summary = {
  businessDate: string;
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
};

type Card = {
  label: string;
  value: string | number;
  helper: string;
};

export default function OperationSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    cargarResumen();

    const interval = window.setInterval(cargarResumen, 30000);

    return () => window.clearInterval(interval);
  }, []);

  async function cargarResumen() {
    try {
      const res = await fetch("/api/operacion/summary");
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar resumen.");
        return;
      }

      setSummary(data.summary);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Error cargando resumen operacional.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-neutral-600">Cargando resumen del día...</p>
      </section>
    );
  }

  if (message) {
    return (
      <section className="rounded-2xl border border-red-100 bg-white p-5 text-sm text-red-700 shadow-sm">
        {message}
      </section>
    );
  }

  if (!summary) return null;

  const cards: Card[] = [
    {
      label: "Ventas del día",
      value: summary.totalSales,
      helper: "Transacciones registradas",
    },
    {
      label: "Monto vendido",
      value: `$${summary.totalRevenue.toLocaleString("es-CL")}`,
      helper: "Total confirmado hoy",
    },
    {
      label: "Pendientes",
      value: summary.pendingOrders,
      helper: "Pedidos por preparar",
    },
    {
      label: "En preparación",
      value: summary.preparingOrders,
      helper: "Pedidos activos",
    },
    {
      label: "Listos",
      value: summary.readyOrders,
      helper: "Esperando entrega",
    },
    {
      label: "Entregados",
      value: summary.deliveredOrders,
      helper: "Pedidos finalizados",
    },
  ];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
            Resumen operativo
          </p>

          <h2 className="mt-1 text-xl font-black text-neutral-900">Hoy</h2>
        </div>

        <button
          type="button"
          onClick={cargarResumen}
          className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition duration-200 hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
        >
          Actualizar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-neutral-100 bg-[#FCF8FF] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {card.label}
            </p>

            <p className="mt-2 text-2xl font-black text-neutral-900">
              {card.value}
            </p>

            <p className="mt-1 text-xs text-neutral-500">{card.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
