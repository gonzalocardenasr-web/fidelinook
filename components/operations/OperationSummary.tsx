"use client";

import { useEffect, useState } from "react";

type Summary = {
  businessDate: string;
  totalSales: number;
  totalRevenue: number;
  identifiedSales: number;
  identifiedRevenue: number;
  newCustomers: number;
  stampsIssued: number;
  expiringRewards: number;
  rewardsIssued: number;
  rewardsRedeemed: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
};

const money = (value: number) => `$${value.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;

export default function OperationSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  async function cargarResumen() {
    try {
      const res = await fetch("/api/operacion/summary", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.message || "No se pudo cargar el resumen.");
        return;
      }
      setSummary(data.summary);
      setUpdatedAt(new Date().toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }));
      setMessage("");
    } catch (error) {
      console.error("Error cargando resumen operacional:", error);
      setMessage("No se pudo actualizar el resumen operacional.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargarResumen();
    const interval = window.setInterval(() => { void cargarResumen(); }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const metric = (label: string, value: string, detail: string) => (
    <div className="min-w-0 px-2 py-2">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-neutral-900">{value}</p>
      <p className="mt-0.5 text-[10px] text-neutral-500">{detail}</p>
    </div>
  );

  return (
    <section className="rounded-xl border border-neutral-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-neutral-900">Resumen operativo</h1>
          <p className="text-[11px] text-neutral-500">Jornada actual · {updatedAt ? `Actualizado ${updatedAt}` : "Actualizando"}</p>
        </div>
        <button type="button" onClick={() => { void cargarResumen(); }}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
          Actualizar
        </button>
      </div>
      {message && <p role="alert" className="mt-2 text-xs text-red-700">{message}</p>}
      {loading && !summary ? <p className="mt-4 text-xs text-neutral-500">Cargando indicadores…</p> : summary && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-1 border-b border-neutral-100 pb-2 md:grid-cols-4">
            {metric("Facturación", money(summary.totalRevenue), `${summary.totalSales} ventas`)}
            {metric("Ticket promedio", summary.totalSales ? money(summary.totalRevenue / summary.totalSales) : "—", "Ventas de la jornada")}
            {metric("Ventas identificadas", summary.totalSales ? `${Math.round(summary.identifiedSales * 100 / summary.totalSales)}%` : "—", `${summary.identifiedSales} de ${summary.totalSales} ventas`)}
            {metric("Clientes nuevos", String(summary.newCustomers), "Registrados hoy")}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 p-3">
              <h2 className="text-sm font-semibold text-neutral-900">Fidelización de hoy</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {metric("Sellos generados", String(summary.stampsIssued), "Créditos positivos de hoy")}
                {metric("Facturación identificada", summary.totalRevenue ? `${Math.round(summary.identifiedRevenue * 100 / summary.totalRevenue)}%` : "—", "Sobre facturación del día")}
                {metric("Premios por vencer", String(summary.expiringRewards), "Activos · próximos 6 días")}
                {metric("Premios otorgados / canjeados", `${summary.rewardsIssued} / ${summary.rewardsRedeemed}`, "Eventos de la jornada")}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <h2 className="text-sm font-semibold text-neutral-900">Operación en curso</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {metric("Pendientes", String(summary.pendingOrders), "Por preparar")}
                {metric("Preparación", String(summary.preparingOrders), "En curso")}
                {metric("Listos", String(summary.readyOrders), "Por entregar")}
                {metric("Entregados", String(summary.deliveredOrders), "Hoy")}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
