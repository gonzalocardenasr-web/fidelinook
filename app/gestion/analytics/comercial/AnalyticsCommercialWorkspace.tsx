"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnalyticsCommercialSummary, AnalyticsProductRanking, AnalyticsFlavorRanking, AnalyticsTopN, AnalyticsRankingMetric } from "@/types/analytics";
import styles from "./commercial.module.css";

type View = "resumen" | "ventas" | "productos" | "sabores";
type Daily = { date: string; salesCount: number; revenue: number };
type Overview = AnalyticsCommercialSummary & { daily?: Daily[] };
type Products = AnalyticsProductRanking & { reconciliation?: { allAllocatedRevenue: number; catalogAllocatedRevenue: number } };
type Flavors = AnalyticsFlavorRanking & { scope?: string };
type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };
const clp = (value: number | null | undefined) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
const fmt = (value: number | null | undefined) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(Number(value || 0));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const links: { view: View; title: string; href: string }[] = [
  { view: "resumen", title: "Resumen", href: "/gestion/analytics/comercial" },
  { view: "ventas", title: "Ventas", href: "/gestion/analytics/comercial/ventas" },
  { view: "productos", title: "Productos", href: "/gestion/analytics/comercial/productos" },
  { view: "sabores", title: "Sabores", href: "/gestion/analytics/comercial/sabores" },
];

export default function AnalyticsCommercialWorkspace({ view }: { view: View }) {
  const [from, setFrom] = useState(() => `${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [channel, setChannel] = useState("");
  const [topN, setTopN] = useState<AnalyticsTopN>(10);
  const [rankBy, setRankBy] = useState<AnalyticsRankingMetric>("revenue");
  const [applied, setApplied] = useState(() => ({ from: `${today().slice(0, 7)}-01`, to: today(), channel: "", topN: 10 as AnalyticsTopN, rankBy: "revenue" as AnalyticsRankingMetric }));
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Products | null>(null);
  const [flavors, setFlavors] = useState<Flavors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const query = useMemo(() => {
    const q = new URLSearchParams({ from: applied.from, to: applied.to, topN: String(applied.topN), rankBy: applied.rankBy });
    if (applied.channel) q.set("channel", applied.channel);
    return q.toString();
  }, [applied]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      const requested = view === "resumen" ? ["overview", "products"] : view === "ventas" ? ["overview"] : view === "productos" ? ["products"] : ["flavors"];
      try {
        const results = await Promise.all(requested.map(async (endpoint) => {
          const response = await fetch(`/api/analytics/commercial/${endpoint}?${query}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
          const payload: ApiResult<unknown> = await response.json();
          if (!response.ok || !payload.ok) throw new Error(!payload.ok ? payload.message : `Error HTTP ${response.status}`);
          return { endpoint, data: payload.data };
        }));
        if (controller.signal.aborted) return;
        for (const result of results) {
          if (result.endpoint === "overview") setOverview(result.data as Overview);
          if (result.endpoint === "products") setProducts(result.data as Products);
          if (result.endpoint === "flavors") setFlavors(result.data as Flavors);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los indicadores.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query, view]);

  const title = links.find((link) => link.view === view)?.title || "Resumen";
  const difference = overview && products?.reconciliation?.allAllocatedRevenue !== undefined
    ? Number(overview.revenue) - Number(products.reconciliation.allAllocatedRevenue) : null;
  const daily = overview?.daily || [];
  const maxRevenue = Math.max(1, ...daily.map((d) => Number(d.revenue)));
  const maxUnits = Math.max(1, ...(products?.products || []).map((p) => Number(p.units)));
  const maxFlavorUnits = Math.max(1, ...(flavors?.flavors || []).map((f) => Number(f.observedUnits)));

  return <main className={styles.workspace}>
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>GESTIÓN / ANALYTICS COMERCIAL</div><h1>{title}</h1></div>
      <Link href="/gestion/analytics" className={styles.legacy}>Analytics anterior ↗</Link>
    </header>
    <nav className={styles.tabs} aria-label="Vistas de Analytics Comercial">
      {links.map((link) => <Link key={link.view} href={link.href} aria-current={view === link.view ? "page" : undefined} className={view === link.view ? styles.activeTab : styles.tab}>{link.title}</Link>)}
    </nav>
    <form className={styles.filters} onSubmit={(event) => {
      event.preventDefault();
      if (!from || !to || from > to) { setError("Selecciona un período válido."); return; }
      setApplied({ from, to, channel, topN, rankBy });
    }}>
      <label>Desde<input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label>Hasta<input type="date" required value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <label>Canal<select value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">Todos</option><option value="local">Local</option><option value="shopify">Shopify</option><option value="uber_eats">Uber Eats</option><option value="rappi">Rappi</option></select></label>
      {(view === "productos" || view === "sabores") && <label>Top<select value={topN} onChange={(e) => setTopN(Number(e.target.value) as AnalyticsTopN)}>{[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>}
      {view === "productos" && <label>Orden<select value={rankBy} onChange={(e) => setRankBy(e.target.value as AnalyticsRankingMetric)}><option value="revenue">Ingresos</option><option value="units">Unidades</option></select></label>}
      <button type="submit" disabled={loading}>Aplicar</button>
    </form>
    <div className={styles.content} aria-busy={loading}>
      {loading && <div className={styles.notice} role="status">Cargando información comercial…</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!loading && !error && view === "resumen" && overview && <div className={styles.stack}>
        <div className={styles.kpis}>
          <Kpi title="Ingresos" value={clp(overview.revenue)} />
          <Kpi title="Ventas" value={fmt(overview.salesCount)} />
          <Kpi title="Ticket promedio" value={clp(overview.averageTicket)} />
          <Kpi title="Ventas identificadas" value={fmt(overview.identifiedSalesCount)} />
          <Kpi title="Compradores identificados" value={fmt(overview.identifiedCustomersCount)} />
        </div>
        <div className={styles.twoColumns}>
          <section className={styles.card}><div className={styles.cardHeader}><h2>Evolución de ingresos</h2><Link href="/gestion/analytics/comercial/ventas">Ver ventas →</Link></div><div className={styles.barArea}>{daily.length ? daily.slice(-14).map((d) => <div key={d.date} className={styles.barColumn} title={`${d.date}: ${clp(d.revenue)}`}><div className={styles.bar} style={{ height: `${Math.max(2, Number(d.revenue) / maxRevenue * 100)}%` }} /><span>{d.date.slice(8)}</span></div>) : <p>Sin ventas en el período.</p>}</div><div className={styles.muted}>Últimos {Math.min(daily.length, 14)} días con ventas · consulta completa en Ventas</div></section>
          <section className={styles.card}><div className={styles.cardHeader}><h2>Productos destacados</h2><Link href="/gestion/analytics/comercial/productos">Ver ranking →</Link></div><div className={styles.rows}>{(products?.products || []).slice(0, 5).map((p, i) => <div className={styles.compactRow} key={`${p.productId}-${i}`}><span>{p.name}</span><strong>{clp(p.allocatedRevenue)}</strong></div>)}{!products?.products?.length && <p>Sin productos para el período.</p>}</div></section>
        </div>
        <div className={styles.footerNote}>{difference === null ? "Conciliación no disponible" : Math.abs(difference) < 0.02 ? "✓ Ingresos conciliados con las asignaciones de venta" : `⚠ Diferencia de conciliación: ${clp(difference)}`} · Ventas confirmadas y pagadas · Fecha comercial de Santiago</div>
      </div>}
      {!loading && !error && view === "ventas" && overview && <div className={styles.stack}>
        <div className={styles.kpis}><Kpi title="Ingresos" value={clp(overview.revenue)} /><Kpi title="Ventas" value={fmt(overview.salesCount)} /><Kpi title="Ticket promedio" value={clp(overview.averageTicket)} /><Kpi title="Ventas identificadas" value={fmt(overview.identifiedSalesCount)} /></div>
        <section className={`${styles.card} ${styles.growCard}`}><div className={styles.cardHeader}><h2>Ventas por fecha comercial</h2><span>{daily.length} días con ventas</span></div><div className={styles.scrollRegion}><table><thead><tr><th>Fecha</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody>{daily.map((d) => <tr key={d.date}><td>{d.date}</td><td>{fmt(d.salesCount)}</td><td>{clp(d.revenue)}</td></tr>)}</tbody></table>{!daily.length && <p>Sin ventas para el período.</p>}</div></section>
      </div>}
      {!loading && !error && view === "productos" && <div className={styles.stack}>
        <div className={styles.kpis}><Kpi title="Ingresos catálogo (total)" value={clp(products?.reconciliation?.catalogAllocatedRevenue)} /><Kpi title="Otras líneas: ingresos" value={clp(products?.customLines?.allocatedRevenue)} /><Kpi title="Otras líneas: unidades" value={fmt(products?.customLines?.units)} /></div>
        <section className={`${styles.card} ${styles.growCard}`}><div className={styles.cardHeader}><h2>Ranking de productos de catálogo</h2><span>Top {applied.topN} · {applied.rankBy === "revenue" ? "ingresos" : "unidades"}</span></div><div className={styles.scrollRegion}><table><thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos asignados</th><th>Participación visual</th></tr></thead><tbody>{(products?.products || []).map((p, i) => <tr key={`${p.productId}-${i}`}><td>{p.name}<small>{p.sku || "Sin SKU"}</small></td><td>{fmt(p.units)}</td><td>{clp(p.allocatedRevenue)}</td><td><div className={styles.meter}><div style={{ width: `${Math.max(0, Math.min(100, Number(p.units) / maxUnits * 100))}%` }} /></div></td></tr>)}</tbody></table>{!products?.products?.length && <p>Sin productos para el período.</p>}</div></section>
        <div className={styles.footerNote}>Las líneas personalizadas pueden contener productos no catalogados, despachos y ajustes. Se presentan separadamente y no se excluyen de los ingresos comerciales.</div>
      </div>}
      {!loading && !error && view === "sabores" && <div className={styles.stack}>
        <div className={styles.warning}><strong>Cobertura parcial.</strong> {flavors?.scope || "Solo sabores registrados en POT-16-LISTO."} No representa todos los sabores consumidos ni atribuye inventario a ventas.</div>
        <div className={styles.kpis}><Kpi title="Líneas elegibles" value={fmt(flavors?.coverage?.eligibleItemRows)} /><Kpi title="Líneas observadas" value={fmt(flavors?.coverage?.observedItemRows)} /><Kpi title="Líneas sin sabor" value={fmt(flavors?.coverage?.unknownItemRows)} /><Kpi title="Cobertura de líneas" value={flavors?.coverage?.observedRowRate == null ? "Sin base" : `${fmt(flavors.coverage.observedRowRate * 100)}%`} /></div>
        <section className={`${styles.card} ${styles.growCard}`}><div className={styles.cardHeader}><h2>Ranking de sabores observados</h2><span>Top {applied.topN} · potes listos</span></div><div className={styles.scrollRegion}><table><thead><tr><th>Sabor</th><th>Unidades observadas</th><th>Comparación</th></tr></thead><tbody>{(flavors?.flavors || []).map((f, i) => <tr key={`${f.flavorId}-${i}`}><td>{f.flavorName}</td><td>{fmt(f.observedUnits)}</td><td><div className={styles.meter}><div style={{ width: `${Math.max(0, Math.min(100, Number(f.observedUnits) / maxFlavorUnits * 100))}%` }} /></div></td></tr>)}</tbody></table>{!flavors?.flavors?.length && <p>Sin sabores observados para el período.</p>}</div></section>
      </div>}
    </div>
  </main>;
}

function Kpi({ title, value }: { title: string; value: string }) {
  return <div className={styles.kpi}><div>{title}</div><strong>{value}</strong></div>;
}
