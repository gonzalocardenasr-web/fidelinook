"use client";
import dashboardFrame from "@/components/analytics/dashboard-frame.module.css";
import { useEffect, useMemo, useState } from "react";
import s from "./sales-evolution.module.css";
import AnalyticsToolbar from "@/components/analytics/AnalyticsToolbar";

type Row = { date: string; salesCount: number; revenue: number };
type Summary = { revenue: number; salesCount: number; averageTicket: number; identifiedSalesCount: number; daily: Row[] };
type Filter = { from: string; to: string; channel: string };
const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const dateLabel = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T12:00:00Z`));
const rangeLabel = (from: string, to: string) => `${dateLabel(from)} – ${dateLabel(to)}`;
const num = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(n);
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const initial = (): Filter => {
  const now = localDate();
  if (typeof window === "undefined") return { from: `${now.slice(0, 7)}-01`, to: now, channel: "" };
  const q = new URLSearchParams(window.location.search);
  const from = q.get("from"), to = q.get("to"), channel = q.get("channel") || "";
  return { from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : `${now.slice(0, 7)}-01`, to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : now, channel: ["local", "shopify", "uber_eats", "rappi"].includes(channel) ? channel : "" };
};
const previousPeriod = (from: string, to: string) => {
  const a = new Date(`${from}T12:00:00Z`), b = new Date(`${to}T12:00:00Z`);
  const length = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  const start = new Date(a.getTime() - length * 86400000), end = new Date(a.getTime() - 86400000);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
};
function Trend({ current, previous, suffix = "%" }: { current: number; previous: number; suffix?: string }) {
  if (!previous) return <span className={s.muted}>Sin base comparable</span>;
  const change = (current / previous - 1) * 100;
  return <span className={change > 0 ? s.good : change < 0 ? s.bad : s.muted}>{change > 0 ? "▲" : change < 0 ? "▼" : "●"} {change > 0 ? "+" : ""}{num(change)}{suffix} vs. período anterior</span>;
}
function DailyChart({ rows, metric }: { rows: Row[]; metric: "revenue" | "salesCount" }) {
  const width = 900, height = 238, left = 90, right = 28, top = 18, bottom = 38;
  const max = Math.max(1, ...rows.map(r => Number(r[metric])));
  const x = (i: number) => left + (rows.length < 2 ? (width - left - right) / 2 : i * (width - left - right) / (rows.length - 1));
  const y = (v: number) => height - bottom - (Number(v) / max) * (height - top - bottom);
  const points = rows.map((r, i) => `${x(i)},${y(r[metric])}`).join(" ");
  const tickEvery = Math.max(1, Math.ceil(rows.length / 7));
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolución diaria de ${metric === "revenue" ? "ingresos" : "ventas"}`} preserveAspectRatio="xMidYMid meet">
    {[0, .25, .5, .75, 1].map(v => <g key={v}><line x1={left} x2={width - right} y1={y(max * v)} y2={y(max * v)} stroke="#e2e8f0" /><text x={left - 9} y={y(max * v) + 4} textAnchor="end" fontSize="12" fill="#64748b">{metric === "revenue" ? `${num(max * v / 1000000)} mill.` : Math.round(max * v)}</text></g>)}
    {rows.length > 1 && <polyline fill="none" stroke="#4f46e5" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" points={points} vectorEffect="non-scaling-stroke" />}
    {rows.map((r, i) => i % tickEvery === 0 || i === rows.length - 1 ? <text key={r.date} x={x(i)} y={height - 9} textAnchor="middle" fontSize="12" fill="#64748b">{r.date.slice(8, 10)}/${r.date.slice(5, 7)}</text> : null)}
    {rows.length === 1 && <circle cx={x(0)} cy={y(rows[0][metric])} r="5" fill="#4f46e5" />}
  </svg>;
}
export default function SalesEvolution() {
  const [draft, setDraft] = useState<Filter>(initial);
  const [filter, setFilter] = useState<Filter>(initial);
  const [data, setData] = useState<Summary | null>(null);
  const [prev, setPrev] = useState<Summary | null>(null);
  const [metric, setMetric] = useState<"revenue" | "salesCount">("revenue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previous = useMemo(() => previousPeriod(filter.from, filter.to), [filter]);
  useEffect(() => {
    const controller = new AbortController();
    const get = async (from: string, to: string) => {
      const q = new URLSearchParams({ from, to }); if (filter.channel) q.set("channel", filter.channel);
      const r = await fetch(`/api/analytics/commercial/overview?${q}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const json = await r.json(); if (!r.ok || !json.ok) throw new Error(json.message || `Error HTTP ${r.status}`);
      return json.data as Summary;
    };
    setLoading(true); setError("");
    Promise.all([get(filter.from, filter.to), get(previous.from, previous.to)]).then(([current, earlier]) => { if (!controller.signal.aborted) { setData(current); setPrev(earlier); } }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Error al consultar ventas"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, previous]);
  const rows = useMemo(() => {
    const map = new Map((data?.daily || []).map(r => [r.date, r]));
    const output: Row[] = []; const cursor = new Date(`${filter.from}T12:00:00Z`), end = new Date(`${filter.to}T12:00:00Z`);
    for (let i = 0; cursor <= end && i < 370; i++, cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10); output.push(map.get(date) || { date, salesCount: 0, revenue: 0 });
    }
    return output;
  }, [data, filter]);
  const average = data?.salesCount ? data.revenue / data.salesCount : 0;
  const peak = rows.reduce<Row | null>((best, row) => !best || row.revenue > best.revenue ? row : best, null);
  const qs = new URLSearchParams({ from: filter.from, to: filter.to }); if (filter.channel) qs.set("channel", filter.channel);
  return <main className={`${s.page} ${dashboardFrame.frame}`}>
    <AnalyticsToolbar section="Ventas" from={draft.from} to={draft.to} channel={draft.channel}
      onFrom={v => setDraft({ ...draft, from: v })} onTo={v => setDraft({ ...draft, to: v })}
      onChannel={v => setDraft({ ...draft, channel: v })} loading={loading}
      items={[{ label: "Resumen", href: `/gestion/analytics?${qs}` }, { label: "Evolución", href: `/gestion/analytics/comercial/ventas?${qs}`, active: true }, { label: "Temporalidad", href: `/gestion/analytics/comercial/ventas/temporalidad?${qs}` }, { label: "Canales", href: `/gestion/analytics/comercial/ventas/canales?${qs}` }, { label: "Productos", href: `/gestion/analytics/comercial/productos?${qs}` }]}
      onApply={e => { e.preventDefault(); if (draft.from > draft.to) { setError("El inicio no puede superar el término."); return; } setFilter({ ...draft }); const q = new URLSearchParams({ from: draft.from, to: draft.to }); if (draft.channel) q.set("channel", draft.channel); window.history.replaceState(null, "", `${window.location.pathname}?${q}`); }} />
    {loading ? <section className={s.notice}>Cargando evolución comercial…</section> : error ? <section className={s.error}>{error}</section> : data && prev ? <div className={s.body}>
      <section className={s.kpis}>
        <article><small>Ingresos</small><strong>{money(data.revenue)}</strong><Trend current={data.revenue} previous={prev.revenue} /></article>
        <article><small>Transacciones</small><strong>{num(data.salesCount)}</strong><Trend current={data.salesCount} previous={prev.salesCount} /></article>
        <article><small>Ticket promedio</small><strong>{money(average)}</strong><Trend current={average} previous={prev.averageTicket} /></article>
        <article><small>Ventas identificadas</small><strong>{num(data.identifiedSalesCount)}</strong><span className={s.muted}>{data.salesCount ? num(data.identifiedSalesCount / data.salesCount * 100) : "0"}% de las ventas</span></article>
      </section>
      <section className={s.mainGrid}>
        <article className={s.chartCard}><div className={s.cardHead}><h2>Comportamiento diario</h2><div className={s.switch}><button className={metric === "revenue" ? s.selected : ""} onClick={() => setMetric("revenue")}>Ingresos</button><button className={metric === "salesCount" ? s.selected : ""} onClick={() => setMetric("salesCount")}>Transacciones</button></div></div>
          <div className={s.chartFrame}>{rows.length ? <DailyChart rows={rows} metric={metric} /> : <p>Sin datos</p>}</div>
          <div className={s.chartStats}><span>Promedio diario: <b>{money(rows.length ? data.revenue / rows.length : 0)}</b></span><span>Mejor día: <b>{peak && peak.revenue > 0 ? `${dateLabel(peak.date)} · ${money(peak.revenue)}` : "Sin ventas"}</b></span></div>
          <p className={s.caption}>Días sin ventas incluidos como cero · Fecha comercial de Santiago</p></article>

      <section className={s.tableCard}><div className={s.cardHead}><h2>Detalle diario</h2><span>{rows.length} días · consulta completa</span></div><div className={s.tableScroll}><table><thead><tr><th>Fecha</th><th>Ventas</th><th>Ingresos</th><th>Ticket promedio</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><td>{dateLabel(row.date)}</td><td>{num(row.salesCount)}</td><td>{money(row.revenue)}</td><td>{row.salesCount ? money(row.revenue / row.salesCount) : "—"}</td></tr>)}</tbody></table></div></section>
      </section>
      <footer>Ventas confirmadas y pagadas · Comparación entre períodos consecutivos de igual duración · Sin estimaciones</footer>
    </div> : null}
  </main>;
}
