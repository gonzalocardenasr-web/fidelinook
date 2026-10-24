"use client";
import dashboardFrame from "@/components/analytics/dashboard-frame.module.css";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnalyticsCommercialSummary, AnalyticsProductRanking, AnalyticsFlavorRanking, AnalyticsTopN, AnalyticsRankingMetric } from "@/types/analytics";
import styles from "./commercial.module.css";
import AnalyticsToolbar from "@/components/analytics/AnalyticsToolbar";

type View = "resumen" | "ventas" | "productos" | "sabores";
type Daily = { date: string; salesCount: number; revenue: number };
type Overview = AnalyticsCommercialSummary & { daily?: Daily[] };
type MonthComparison = { previous: Overview; comparableRevenue: number; comparableSales: number; previousFullRevenue: number; previousFullSales: number; comparableThrough: string };
type ChannelDatum = { code: string; label: string; revenue: number; salesCount: number };
type Products = AnalyticsProductRanking & { reconciliation?: { allAllocatedRevenue: number; catalogAllocatedRevenue: number } };
type Flavors = AnalyticsFlavorRanking & { scope?: string };
type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };
const clp = (value: number | null | undefined) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
const fmt = (value: number | null | undefined) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(Number(value || 0));
const shiftMonth = (date: string, delta: number) => {
  const [year, month] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};
const daysInMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};
const initialFilters = () => {
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const defaults = { from: `${now.slice(0, 7)}-01`, to: now, channel: "", topN: 10 as AnalyticsTopN, rankBy: "revenue" as AnalyticsRankingMetric };
  if (typeof window === "undefined") return defaults;
  const params = new URLSearchParams(window.location.search);
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const from = params.get("from"), to = params.get("to");
  if (from && to && date.test(from) && date.test(to) && from <= to) { defaults.from = from; defaults.to = to; }
  const channel = params.get("channel");
  if (channel && ["local", "shopify", "uber_eats", "rappi"].includes(channel)) defaults.channel = channel;
  const top = Number(params.get("topN"));
  if ([5,10,20,50].includes(top)) defaults.topN = top as AnalyticsTopN;
  if (params.get("rankBy") === "units") defaults.rankBy = "units";
  return defaults;
};
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const links: { view: View; title: string; href: string }[] = [
  { view: "resumen", title: "Resumen", href: "/gestion/analytics" },
  { view: "ventas", title: "Ventas", href: "/gestion/analytics/comercial/ventas" },
  { view: "productos", title: "Productos", href: "/gestion/analytics/comercial/productos" },
  { view: "sabores", title: "Sabores", href: "/gestion/analytics/comercial/sabores" },
];

export default function AnalyticsCommercialWorkspace({ view }: { view: View }) {
  const [initial] = useState(initialFilters);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [channel, setChannel] = useState(initial.channel);
  const [topN, setTopN] = useState<AnalyticsTopN>(initial.topN);
  const [rankBy, setRankBy] = useState<AnalyticsRankingMetric>(initial.rankBy);
  const [applied, setApplied] = useState(initial);
  const [channels, setChannels] = useState<ChannelDatum[]>([]);
  const [previousMonth, setPreviousMonth] = useState<Overview | null>(null);
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

  const comparisonEligible = applied.from === `${applied.to.slice(0, 7)}-01`;
  const previousYearMonth = shiftMonth(applied.to, -1);
  const previousEnd = `${previousYearMonth}-${String(daysInMonth(previousYearMonth)).padStart(2, "0")}`;
  const comparableDay = Math.min(Number(applied.to.slice(8)), daysInMonth(previousYearMonth));
  const previousComparableEnd = `${previousYearMonth}-${String(comparableDay).padStart(2, "0")}`;
  const comparison: MonthComparison | null = comparisonEligible && previousMonth ? {
    previous: previousMonth,
    comparableRevenue: (previousMonth.daily || []).filter((d) => d.date <= previousComparableEnd).reduce((sum, d) => sum + Number(d.revenue), 0),
    comparableSales: (previousMonth.daily || []).filter((d) => d.date <= previousComparableEnd).reduce((sum, d) => sum + Number(d.salesCount), 0),
    previousFullRevenue: Number(previousMonth.revenue),
    previousFullSales: Number(previousMonth.salesCount),
    comparableThrough: previousComparableEnd,
  } : null;
  const comparableTicket = comparison && comparison.comparableSales > 0 ? comparison.comparableRevenue / comparison.comparableSales : null;
  const accumulated = (rows: Daily[], limit: number) => {
    const byDay = new Map(rows.map(row => [Number(row.date.slice(8)), Number(row.revenue)]));
    let total = 0;
    return Array.from({ length: limit }, (_, i) => { total += byDay.get(i + 1) || 0; return total; });
  };
  const currentCumulative = overview ? accumulated(overview.daily || [], Number(applied.to.slice(8))) : [];
  const previousCumulative = previousMonth ? accumulated(previousMonth.daily || [], daysInMonth(previousYearMonth)) : [];
  const channelTotal = channels.reduce((sum, item) => sum + item.revenue, 0);
  const channelDifference = overview && channels.length === 4 ? Number(overview.revenue) - channelTotal : null;
  const navQuery = new URLSearchParams({ from: applied.from, to: applied.to, topN: String(applied.topN), rankBy: applied.rankBy });
  if (applied.channel) navQuery.set("channel", applied.channel);

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
        if (view === "resumen" && comparisonEligible) {
          const previousParams = new URLSearchParams({ from: `${previousYearMonth}-01`, to: previousEnd });
          if (applied.channel) previousParams.set("channel", applied.channel);
          const response = await fetch(`/api/analytics/commercial/overview?${previousParams}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
          const payload: ApiResult<Overview> = await response.json();
          if (!response.ok || !payload.ok) throw new Error(!payload.ok ? payload.message : `Error HTTP ${response.status}`);
          if (!controller.signal.aborted) setPreviousMonth(payload.data);
        } else if (!controller.signal.aborted) setPreviousMonth(null);
        if (view === "resumen" && !applied.channel) {
          const definitions = [{ code: "local", label: "Local" }, { code: "shopify", label: "Shopify" }, { code: "uber_eats", label: "Uber Eats" }, { code: "rappi", label: "Rappi" }];
          const breakdown = await Promise.all(definitions.map(async (definition) => {
            const params = new URLSearchParams({ from: applied.from, to: applied.to, channel: definition.code });
            const response = await fetch(`/api/analytics/commercial/overview?${params}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
            const payload: ApiResult<Overview> = await response.json();
            if (!response.ok || !payload.ok) throw new Error(!payload.ok ? payload.message : `Error HTTP ${response.status}`);
            return { ...definition, revenue: Number(payload.data.revenue), salesCount: Number(payload.data.salesCount) };
          }));
          if (!controller.signal.aborted) setChannels(breakdown.sort((a,b) => b.revenue - a.revenue));
        } else if (!controller.signal.aborted) setChannels([]);
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
  }, [query, view, comparisonEligible, previousYearMonth, previousEnd, applied.channel]);

  const title = links.find((link) => link.view === view)?.title || "Resumen";
  const difference = overview && products?.reconciliation?.allAllocatedRevenue !== undefined
    ? Number(overview.revenue) - Number(products.reconciliation.allAllocatedRevenue) : null;
  const daily = overview?.daily || [];
  const maxRevenue = Math.max(1, ...daily.map((d) => Number(d.revenue)));
  const maxProductMetric = Math.max(1, ...(products?.products || []).map((p) => Number(applied.rankBy === "revenue" ? p.allocatedRevenue : p.units)));
  const catalogRevenue = Number(products?.reconciliation?.catalogAllocatedRevenue || 0);
  const maxFlavorUnits = Math.max(1, ...(flavors?.flavors || []).map((f) => Number(f.observedUnits)));

  return <main className={`${styles.workspace} ${dashboardFrame.frame}`}>
    <AnalyticsToolbar section="Analytics" from={from} to={to} channel={channel}
      onFrom={setFrom} onTo={setTo} onChannel={setChannel} loading={loading}
      items={links.map(link => ({ label: link.title, href: `${link.href}?${navQuery.toString()}`, active: view === link.view }))}
      onApply={event => { event.preventDefault(); if (!from || !to || from > to) { setError("Selecciona un período válido."); return; } const next = { from, to, channel, topN, rankBy }; setApplied(next); const params = new URLSearchParams({ from, to, topN: String(topN), rankBy }); if (channel) params.set("channel", channel); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); }}>
      {(view === "productos" || view === "sabores") && <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}>Top <select value={topN} onChange={e => setTopN(Number(e.target.value) as AnalyticsTopN)}>{[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
      {view === "productos" && <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}>Orden <select value={rankBy} onChange={e => setRankBy(e.target.value as AnalyticsRankingMetric)}><option value="revenue">Ingresos</option><option value="units">Unidades</option></select></label>}
    </AnalyticsToolbar>
    <div className={styles.content} aria-busy={loading}>
      {loading && <div className={styles.notice} role="status">Cargando información comercial…</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!loading && !error && view === "resumen" && overview && <div className={styles.stack}>
        <div className={`${styles.kpis} ${styles.executiveKpis}`}>
          <ExecutiveKpi title="Ingresos" value={clp(overview.revenue)} comparison={comparison ? { current: Number(overview.revenue), reference: comparison.comparableRevenue, referenceLabel: clp(comparison.comparableRevenue), extra: comparison.previousFullRevenue > 0 ? `${fmt(Number(overview.revenue) / comparison.previousFullRevenue * 100)}% del mes anterior completo (${clp(comparison.previousFullRevenue)})` : undefined } : null} />
          <ExecutiveKpi title="Ventas" value={fmt(overview.salesCount)} comparison={comparison ? { current: Number(overview.salesCount), reference: comparison.comparableSales, referenceLabel: fmt(comparison.comparableSales) } : null} />
          <ExecutiveKpi title="Ticket promedio" value={clp(overview.averageTicket)} comparison={comparison && comparableTicket !== null ? { current: Number(overview.averageTicket), reference: comparableTicket, referenceLabel: clp(comparableTicket) } : null} />
          <ExecutiveKpi title="Ventas identificadas" value={fmt(overview.identifiedSalesCount)} subtitle={overview.salesCount > 0 ? `${fmt(Number(overview.identifiedSalesCount) / Number(overview.salesCount) * 100)}% de las ventas` : "Sin ventas"} />
          <ExecutiveKpi title="Compradores identificados" value={fmt(overview.identifiedCustomersCount)} subtitle="Clientes únicos en el período" />
        </div>
        {!comparisonEligible && <div className={styles.comparisonHint}>Para comparar meses, selecciona desde el día 1 hasta una fecha del mismo mes.</div>}
        <div className={styles.executiveGrid}>
          <section className={styles.card}><div className={styles.cardHeader}><h2>{comparison ? "Ingresos acumulados · mes a mes" : "Evolución diaria de ingresos"}</h2><Link href="/gestion/analytics/comercial/ventas">Ver ventas →</Link></div>
            {comparison ? <div className={styles.chartAndInsights}>
              <CumulativeChart current={currentCumulative} previous={previousCumulative} />
              <div className={styles.insightPanel} aria-label="Lectura comercial del período comparable">
                <h3>Lectura comercial</h3>
                <Insight title="Diferencia de ingresos" current={Number(overview.revenue)} reference={comparison.comparableRevenue} kind="money" />
                <Insight title="Diferencia de ventas" current={Number(overview.salesCount)} reference={comparison.comparableSales} kind="count" />
                {comparableTicket !== null && <Insight title="Variación del ticket" current={Number(overview.averageTicket)} reference={comparableTicket} kind="percentage" />}
              </div>
            </div> : <div className={styles.barArea}>{daily.slice(-14).map((d) => <div key={d.date} className={styles.barColumn} title={`${d.date}: ${clp(d.revenue)}`}><div className={styles.bar} style={{ height: `${Math.max(2, Number(d.revenue) / maxRevenue * 100)}%` }} /><span>{d.date.slice(8)}</span></div>)}</div>}
          </section>
          <section className={styles.card}><div className={styles.cardHeader}><h2>Canales · participación en ingresos</h2><span>{applied.channel ? "Canal filtrado" : "Todos los canales"}</span></div>
            {applied.channel ? <div className={styles.channelSingle}>Filtro activo: {applied.channel}. Selecciona «Todos» para comparar canales.</div> : <div className={styles.channelRows}>{channels.map((item) => <div key={item.code} className={styles.channelRow}><div><strong>{item.label}</strong><span>{clp(item.revenue)} · {fmt(item.salesCount)} ventas</span></div><div className={styles.channelTrack}><div style={{ width: `${channelTotal > 0 ? item.revenue / channelTotal * 100 : 0}%` }} /></div><b>{channelTotal > 0 ? fmt(item.revenue / channelTotal * 100) : "0"}%</b></div>)}{channels.length === 0 && <p>Sin datos de canales.</p>}{channelDifference !== null && Math.abs(channelDifference) > 0.02 && <p className={styles.negative}>Diferencia entre canales y total: {clp(channelDifference)}. Revisar canales no contemplados.</p>}</div>}
          </section>
          <section className={`${styles.card} ${styles.productsCard}`}><div className={styles.cardHeader}><h2>Productos destacados</h2><Link href="/gestion/analytics/comercial/productos">Ver ranking →</Link></div><div className={styles.rows}>{(products?.products || []).slice(0, 5).map((p, i) => <div className={styles.compactRow} key={`${p.productId}-${i}`}><span>{p.name}</span><strong>{clp(p.allocatedRevenue)}</strong></div>)}{!products?.products?.length && <p>Sin productos para el período.</p>}</div></section>
        </div>
        <div className={styles.footerNote}>{difference === null ? "Conciliación no disponible" : Math.abs(difference) < 0.02 ? "✓ Ingresos conciliados con las asignaciones de venta" : `⚠ Diferencia de conciliación: ${clp(difference)}`} · Ventas confirmadas y pagadas · Fecha comercial de Santiago</div>
      </div>}
      {!loading && !error && view === "ventas" && overview && <div className={styles.stack}>
        <div className={styles.kpis}><Kpi title="Ingresos" value={clp(overview.revenue)} /><Kpi title="Ventas" value={fmt(overview.salesCount)} /><Kpi title="Ticket promedio" value={clp(overview.averageTicket)} /><Kpi title="Ventas identificadas" value={fmt(overview.identifiedSalesCount)} /></div>
        <section className={`${styles.card} ${styles.growCard}`}><div className={styles.cardHeader}><h2>Ventas por fecha comercial</h2><span>{daily.length} días con ventas</span></div><div className={styles.scrollRegion}><table><thead><tr><th>Fecha</th><th>Ventas</th><th>Ingresos</th></tr></thead><tbody>{daily.map((d) => <tr key={d.date}><td>{d.date}</td><td>{fmt(d.salesCount)}</td><td>{clp(d.revenue)}</td></tr>)}</tbody></table>{!daily.length && <p>Sin ventas para el período.</p>}</div></section>
      </div>}
      {!loading && !error && view === "productos" && <div className={styles.stack}>
        <div className={styles.kpis}><Kpi title="Ingresos catálogo (total)" value={clp(products?.reconciliation?.catalogAllocatedRevenue)} /><Kpi title="Otras líneas: ingresos" value={clp(products?.customLines?.allocatedRevenue)} /><Kpi title="Otras líneas: unidades" value={fmt(products?.customLines?.units)} /></div>
        <section className={`${styles.card} ${styles.growCard}`}>
          <div className={styles.cardHeader}>
            <h2>Ranking de productos de catálogo</h2>
            <span>Top {applied.topN} · ordenado por {applied.rankBy === "revenue" ? "ingresos" : "unidades"}</span>
          </div>
          <div className={styles.productDashboard}>
            <div className={styles.productRanking} aria-label="Comparación visual de productos">
              {(products?.products || []).map((p, i) => {
                const metric = Number(applied.rankBy === "revenue" ? p.allocatedRevenue : p.units);
                return <div className={styles.productRankingRow} key={`${p.productId}-${i}`} title={`${p.name} · ${fmt(p.units)} unidades · ${clp(p.allocatedRevenue)} ingresos asignados`}>
                  <span className={styles.productRankName}>{i + 1}. {p.name}</span>
                  <div className={styles.productRankTrack}><div className={styles.productRankFill} style={{width: `${Math.max(0, Math.min(100, metric / maxProductMetric * 100))}%`}} /></div>
                  <strong>{applied.rankBy === "revenue" ? clp(p.allocatedRevenue) : fmt(p.units)}</strong>
                </div>;
              })}
              {!products?.products?.length && <p>Sin productos para el período.</p>}
            </div>
            <div className={styles.productTablePane}>
              <div className={styles.productTableHeading}>Detalle y participación en ingresos del catálogo</div>
              <div className={styles.scrollRegion}><table><thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th><th>% catálogo</th></tr></thead>
                <tbody>{(products?.products || []).map((p, i) => <tr key={`${p.productId}-${i}`} title={`${p.name} · ${p.sku || "Sin SKU"}`}><td>{p.name}<small>{p.sku || "Sin SKU"}</small></td><td>{fmt(p.units)}</td><td>{clp(p.allocatedRevenue)}</td><td>{catalogRevenue > 0 ? `${fmt(Number(p.allocatedRevenue) / catalogRevenue * 100)}%` : "—"}</td></tr>)}</tbody>
              </table></div>
            </div>
          </div>
        </section>
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

function ExecutiveKpi({ title, value, comparison, subtitle }: {
  title: string;
  value: string;
  comparison?: { current: number; reference: number; referenceLabel: string; extra?: string } | null;
  subtitle?: string;
}) {
  const hasReference = comparison && comparison.reference > 0;
  const change = hasReference ? (comparison.current / comparison.reference - 1) * 100 : null;
  const tone = change === null ? styles.neutral : change > 0 ? styles.positive : change < 0 ? styles.negative : styles.neutral;
  return <div className={`${styles.kpi} ${styles.executiveKpi}`}>
    <div>{title}</div>
    <strong>{value}</strong>
    {comparison ? <>
      <small className={tone}>{change === null ? "Sin base comparable" : `${change > 0 ? "▲" : change < 0 ? "▼" : "="} ${change > 0 ? "+" : ""}${fmt(change)}% vs. mes anterior`}</small>
      <span className={styles.kpiDetail}>Referencia MTD: {comparison.referenceLabel}</span>
      {comparison.extra && <span className={styles.kpiDetail}>{comparison.extra}</span>}
    </> : <span className={styles.kpiDetail}>{subtitle || ""}</span>}
  </div>;
}

function Kpi({ title, value }: { title: string; value: string }) {
  return <div className={styles.kpi}><div>{title}</div><strong>{value}</strong></div>;
}

function Insight({ title, current, reference, kind }: { title: string; current: number; reference: number; kind: "money" | "count" | "percentage" }) {
  const diff = current - reference;
  const change = reference > 0 ? (diff / reference) * 100 : null;
  const direction = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
  const tone = diff > 0 ? styles.positive : diff < 0 ? styles.negative : styles.neutral;
  const display = kind === "percentage"
    ? change === null ? "Sin base comparable" : `${direction} ${change > 0 ? "+" : ""}${fmt(change)}%`
    : kind === "money" ? `${direction} ${diff > 0 ? "+" : diff < 0 ? "−" : ""}${clp(Math.abs(diff))}`
    : `${direction} ${diff > 0 ? "+" : diff < 0 ? "−" : ""}${fmt(Math.abs(diff))}`;
  return <div className={styles.insightRow}>
    <span>{title}</span>
    <strong className={tone}>{display}</strong>
    <small>{kind === "percentage" ? "vs. ticket del MTD anterior" : "vs. mismo día del mes anterior"}</small>
  </div>;
}

function CumulativeChart({ current, previous }: { current: number[]; previous: number[] }) {
  const max = Math.max(1, ...current, ...previous);
  const width = 720, height = 225, left = 68, right = 20, top = 18, bottom = 30;
  const x = (index: number) => left + (index / 30) * (width - left - right);
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const path = (values: number[]) => values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return <div className={styles.chartBox}>
    <div className={styles.chartLegend}><span><i className={styles.legendCurrent} />Mes seleccionado</span><span><i className={styles.legendPrevious} />Mes anterior completo</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Comparación de ingresos acumulados por día del mes" preserveAspectRatio="xMidYMid meet">
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1={left} y1={y(max * fraction)} x2={width-right} y2={y(max*fraction)} stroke="#e2e8f0" /><text x={left-7} y={y(max*fraction)+4} textAnchor="end" fontSize="12" fill="#64748b">{Math.round(max*fraction/1000000*10)/10}M</text></g>)}
      {[1, 5, 10, 15, 20, 25, 30].map((day) => <text key={day} x={x(day-1)} y={height-8} textAnchor="middle" fontSize="12" fill="#64748b">{day}</text>)}
      <path d={path(previous)} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 5" vectorEffect="non-scaling-stroke"><title>Mes anterior: ingresos acumulados</title></path>
      <path d={path(current)} fill="none" stroke="#4f46e5" strokeWidth="3" vectorEffect="non-scaling-stroke"><title>Mes seleccionado: ingresos acumulados</title></path>
    </svg>
    <div className={styles.chartCaption}>Comparación por día calendario · CLP acumulados · la curva actual termina en la fecha seleccionada.</div>
  </div>;
}
