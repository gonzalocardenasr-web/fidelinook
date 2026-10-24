"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsCommercialSummary, AnalyticsProductRanking, AnalyticsFlavorRanking, AnalyticsTopN, AnalyticsRankingMetric } from "@/types/analytics";

type Daily = { date: string; salesCount: number; revenue: number };
type Overview = AnalyticsCommercialSummary & { daily?: Daily[] };
type Products = AnalyticsProductRanking & { reconciliation?: { allAllocatedRevenue: number; catalogAllocatedRevenue: number } };
type Flavors = AnalyticsFlavorRanking & { scope?: string };
type Result<T> = { ok: true; data: T } | { ok: false; message: string };
const money = (v: number | null | undefined) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(v || 0));
const number = (v: number | null | undefined) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(Number(v || 0));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const firstDay = () => `${today().slice(0, 7)}-01`;
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#475569" };
const field: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 10px", background: "#fff", color: "#0f172a" };

export default function AnalyticsComercialPage() {
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);
  const [channel, setChannel] = useState("");
  const [topN, setTopN] = useState<AnalyticsTopN>(10);
  const [rankBy, setRankBy] = useState<AnalyticsRankingMetric>("revenue");
  const [filters, setFilters] = useState({ from: firstDay(), to: today(), channel: "", topN: 10 as AnalyticsTopN, rankBy: "revenue" as AnalyticsRankingMetric });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Products | null>(null);
  const [flavors, setFlavors] = useState<Flavors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    const q = new URLSearchParams({ from: filters.from, to: filters.to, topN: String(filters.topN), rankBy: filters.rankBy });
    if (filters.channel) q.set("channel", filters.channel);
    try {
      const endpoints = ["overview", "products", "flavors"] as const;
      const responses = await Promise.all(endpoints.map(async (key) => {
        const response = await fetch(`/api/analytics/commercial/${key}?${q}`, { credentials: "same-origin", cache: "no-store", signal });
        const json: Result<unknown> = await response.json();
        if (!response.ok || !json.ok) throw new Error(!json.ok ? json.message : `Error HTTP ${response.status}`);
        return json.data;
      }));
      if (signal.aborted) return;
      setOverview(responses[0] as Overview);
      setProducts(responses[1] as Products);
      setFlavors(responses[2] as Flavors);
    } catch (e) {
      if (signal.aborted) return;
      setOverview(null); setProducts(null); setFlavors(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar Analytics Comercial.");
    } finally { if (!signal.aborted) setLoading(false); }
  }, [filters]);

  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (from > to) { setError("La fecha desde no puede ser posterior a hasta."); return; }
    setFilters({ from, to, channel: channel.trim(), topN, rankBy });
  };
  const totalAllocated = products?.reconciliation?.allAllocatedRevenue;
  const difference = totalAllocated === undefined || !overview ? null : Number(overview.revenue) - Number(totalAllocated);

  return <main style={{ maxWidth: 1380, margin: "0 auto", padding: "28px 20px 48px", color: "#0f172a" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
      <div><p style={{ ...label, margin: "0 0 6px" }}>GESTIÓN / ANALYTICS</p><h1 style={{ fontSize: 29, margin: 0 }}>Analytics Comercial</h1><p style={{ color: "#64748b", marginTop: 8 }}>Ventas confirmadas y pagadas · Fechas comerciales de Santiago</p></div>
      <Link href="/gestion/analytics" style={{ ...field, textDecoration: "none" }}>← Analytics anterior</Link>
    </div>
    <form onSubmit={apply} style={{ ...panel, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "end", marginBottom: 20 }}>
      <label style={{ display: "grid", gap: 6, ...label }}>Desde<input aria-label="Desde" type="date" required value={from} onChange={e => setFrom(e.target.value)} style={field}/></label>
      <label style={{ display: "grid", gap: 6, ...label }}>Hasta<input aria-label="Hasta" type="date" required value={to} onChange={e => setTo(e.target.value)} style={field}/></label>
      <label style={{ display: "grid", gap: 6, ...label }}>Canal<select aria-label="Canal" value={channel} onChange={e => setChannel(e.target.value)} style={field}><option value="">Todos</option><option value="local">Local</option><option value="shopify">Shopify</option><option value="uber_eats">Uber Eats</option><option value="rappi">Rappi</option></select></label>
      <label style={{ display: "grid", gap: 6, ...label }}>Top N<select aria-label="Top N" value={topN} onChange={e => setTopN(Number(e.target.value) as AnalyticsTopN)} style={field}>{[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label style={{ display: "grid", gap: 6, ...label }}>Ordenar productos por<select aria-label="Ordenar productos por" value={rankBy} onChange={e => setRankBy(e.target.value as AnalyticsRankingMetric)} style={field}><option value="revenue">Ingresos</option><option value="units">Unidades</option></select></label>
      <button type="submit" disabled={loading} style={{ ...field, background: "#0f172a", color: "#fff", cursor: "pointer", padding: "10px 18px" }}>Aplicar filtros</button>
    </form>
    {loading && <p role="status">Cargando indicadores comerciales…</p>}
    {error && <div role="alert" style={{ ...panel, borderColor: "#fca5a5", background: "#fff7f7", marginBottom: 18 }}>No se pudieron cargar los indicadores: {error}</div>}
    {!loading && !error && overview && <>
      <section aria-label="Resumen ejecutivo" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 21 }}>Resumen ejecutivo</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(205px,1fr))", gap: 12 }}>
          {[["Ingresos", money(overview.revenue)], ["Ventas", number(overview.salesCount)], ["Ticket promedio", money(overview.averageTicket)], ["Ventas identificadas", number(overview.identifiedSalesCount)], ["Clientes compradores identificados", number(overview.identifiedCustomersCount)]].map(([name,value]) => <div key={name} style={panel}><div style={label}>{name}</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 10 }}>{value}</div></div>)}
        </div>
      </section>
      <section style={{ ...panel, marginBottom: 24 }}><h2 style={{ fontSize: 21, marginTop: 0 }}>Evolución diaria</h2>
        {!overview.daily?.length ? <p>Sin ventas en el período seleccionado.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ textAlign: "left", padding: 10 }}>Fecha</th><th style={{ textAlign: "right", padding: 10 }}>Ventas</th><th style={{ textAlign: "right", padding: 10 }}>Ingresos</th></tr></thead><tbody>{overview.daily.map(d => <tr key={d.date} style={{ borderTop: "1px solid #e5e7eb" }}><td style={{ padding: 10 }}>{d.date}</td><td style={{ textAlign: "right", padding: 10 }}>{number(d.salesCount)}</td><td style={{ textAlign: "right", padding: 10 }}>{money(d.revenue)}</td></tr>)}</tbody></table></div>}
      </section>
      <section style={{ ...panel, marginBottom: 24 }}><h2 style={{ fontSize: 21, marginTop: 0 }}>Ranking de productos</h2>
        {!products?.products?.length ? <p>Sin productos para este período.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ textAlign: "left", padding: 10 }}>Producto</th><th style={{ textAlign: "right", padding: 10 }}>Unidades</th><th style={{ textAlign: "right", padding: 10 }}>Ingresos asignados</th></tr></thead><tbody>{products.products.map((p,i) => <tr key={`${p.productId ?? p.sku ?? p.name}-${i}`} style={{ borderTop: "1px solid #e5e7eb" }}><td style={{ padding: 10 }}>{p.name}<div style={{ fontSize: 12, color: "#64748b" }}>{p.sku || "Sin SKU"}</div></td><td style={{ textAlign: "right", padding: 10 }}>{number(p.units)}</td><td style={{ textAlign: "right", padding: 10 }}>{money(p.allocatedRevenue)}</td></tr>)}</tbody></table></div>}
        <p style={{ color: "#475569", fontSize: 13 }}>Otras líneas de venta (custom_line): {number(products?.customLines?.units)} unidades · {money(products?.customLines?.allocatedRevenue)}. Pueden incluir productos sin catálogo, despachos y ajustes.</p>
        {difference !== null && <p style={{ fontSize: 13, color: Math.abs(difference) < 0.02 ? "#166534" : "#b91c1c" }}>Conciliación de ingresos del período: {Math.abs(difference) < 0.02 ? "Correcta" : `Diferencia ${money(difference)}`}</p>}
      </section>
      <section style={panel}><h2 style={{ fontSize: 21, marginTop: 0 }}>Ranking de sabores observados</h2>
        <p style={{ color: "#92400e", background: "#fffbeb", padding: 12, borderRadius: 8, fontSize: 14 }}><strong>Cobertura parcial:</strong> {flavors?.scope || "Solo sabores registrados en POT-16-LISTO. No incluye sabores de simples, dobles ni potes armados."} No representa el ranking global de sabores consumidos.</p>
        {!flavors?.flavors?.length ? <p>Sin sabores observados para este período.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ textAlign: "left", padding: 10 }}>Sabor</th><th style={{ textAlign: "right", padding: 10 }}>Unidades observadas</th></tr></thead><tbody>{flavors.flavors.map((f,i) => <tr key={`${f.flavorId ?? f.flavorName}-${i}`} style={{ borderTop: "1px solid #e5e7eb" }}><td style={{ padding: 10 }}>{f.flavorName}</td><td style={{ textAlign: "right", padding: 10 }}>{number(f.observedUnits)}</td></tr>)}</tbody></table></div>}
        <p style={{ fontSize: 13, color: "#475569" }}>Cobertura de líneas elegibles: {number(flavors?.coverage?.observedItemRows)} / {number(flavors?.coverage?.eligibleItemRows)} ({flavors?.coverage?.observedRowRate == null ? "sin base" : `${number(flavors.coverage.observedRowRate * 100)}%`}). Líneas sin sabor: {number(flavors?.coverage?.unknownItemRows)}.</p>
      </section>
    </>}
  </main>;
}
