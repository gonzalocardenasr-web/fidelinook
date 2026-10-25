"use client";
import { useEffect, useMemo, useState } from "react";
import AnalyticsToolbar from "@/components/analytics/AnalyticsToolbar";
import s from "./global.module.css";

type Filters = { from: string; to: string; channel: string };
type Summary = { revenue: number; salesCount: number; averageTicket: number };
type Month = { key: string; label: string; revenue: number; salesCount: number; averageTicket: number; partial: boolean };
type Metric = "revenue" | "salesCount" | "averageTicket";
const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const integer = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function initial(): Filters {
  const d = today();
  if (typeof window === "undefined") return { from: `${d.slice(0,7)}-01`, to: d, channel: "" };
  const q = new URLSearchParams(window.location.search);
  const to = q.get("to") || d;
  const from = q.get("from") || `${to.slice(0,7)}-01`;
  return { from: /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : `${d.slice(0,7)}-01`, to: /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : d, channel: ["local","shopify","uber_eats","rappi"].includes(q.get("channel") || "") ? q.get("channel")! : "" };
}
function monthShift(ym: string, shift: number): string {
  const [y,m] = ym.split("-").map(Number); const date = new Date(Date.UTC(y,m-1+shift,1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;
}
function monthEnd(ym: string): string { const [y,m] = ym.split("-").map(Number); return `${ym}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,"0")}`; }
function monthLabel(ym: string): string { const [y,m] = ym.split("-").map(Number); return new Intl.DateTimeFormat("es-CL", { month:"short", year:"2-digit", timeZone:"UTC" }).format(new Date(Date.UTC(y,m-1,15))).replace(".",""); }
function pct(current: number, previous: number): string { return previous ? `${current >= previous ? current / previous >= 1 ? "+" : "" : ""}${((current/previous-1)*100).toLocaleString("es-CL", {maximumFractionDigits:1})}%` : "—"; }
function format(metric: Metric, value: number) { return metric === "salesCount" ? integer(value) : money(value); }
async function getSummary(from: string, to: string, channel: string, signal: AbortSignal): Promise<Summary> {
  const q = new URLSearchParams({from,to}); if(channel) q.set("channel",channel);
  const response = await fetch(`/api/analytics/commercial/overview?${q}`, {credentials:"same-origin", cache:"no-store", signal});
  const body = await response.json(); if(!response.ok || !body.ok) throw new Error(body.message || `Error HTTP ${response.status}`);
  return body.data as Summary;
}
function MonthlyChart({rows,metric}:{rows:Month[];metric:Metric}) {
  const width=980, height=265, left=72, right=20, top=18, bottom=40;
  const max=Math.max(1,...rows.map(r=>r[metric])); const y=(v:number)=>height-bottom-v/max*(height-top-bottom);
  const x=(i:number)=>left+(i+.5)*(width-left-right)/12; const barWidth=(width-left-right)/12*.58;
  return <svg viewBox={`0 0 ${width} ${height}`} className={s.chart} role="img" aria-label="Evolución mensual del negocio">
    {[0,.25,.5,.75,1].map(p=><g key={p}><line x1={left} x2={width-right} y1={y(max*p)} y2={y(max*p)} stroke="#e2e8f0"/><text x={left-9} y={y(max*p)+4} textAnchor="end" fill="#64748b" fontSize="12">{metric === "revenue" ? `${(max*p/1000000).toLocaleString("es-CL",{maximumFractionDigits:1})} M` : metric === "averageTicket" ? `${Math.round(max*p/1000)} mil` : integer(Math.round(max*p))}</text></g>)}
    {rows.map((r,i)=><g key={r.key}><rect x={x(i)-barWidth/2} y={y(r[metric])} width={barWidth} height={Math.max(0,height-bottom-y(r[metric]))} rx="4" fill={r.partial ? "#e879a5" : "#4f46e5"}><title>{`${r.label}: ${format(metric,r[metric])}${r.partial ? " · mes parcial" : ""}`}</title></rect><text x={x(i)} y={height-13} textAnchor="middle" fontSize="12" fill="#475569">{r.label}</text></g>)}
  </svg>;
}
export default function GlobalAnalytics() {
  const [draft,setDraft]=useState<Filters>(initial); const [filter,setFilter]=useState<Filters>(initial);
  const [rows,setRows]=useState<Month[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [metric,setMetric]=useState<Metric>("revenue");
  const anchor=filter.to.slice(0,7);
  useEffect(()=>{
    const controller=new AbortController(); setLoading(true); setError("");
    const months=Array.from({length:12},(_,i)=>monthShift(anchor,i-11));
    // Each monthly request reuses the protected, reconciled commercial overview RPC.
    Promise.all(months.map(async key=>{
      const end=key===anchor ? filter.to : monthEnd(key);
      const summary=await getSummary(`${key}-01`,end,filter.channel,controller.signal);
      return {key,label:monthLabel(key),revenue:Number(summary.revenue)||0,salesCount:Number(summary.salesCount)||0,averageTicket:Number(summary.salesCount)>0 ? Number(summary.revenue)/Number(summary.salesCount) : 0,partial:end<monthEnd(key)};
    })).then(data=>{if(!controller.signal.aborted) setRows(data);}).catch(e=>{if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "No fue posible consultar la evolución mensual.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[anchor,filter.to,filter.channel]);
  const totals=useMemo(()=>rows.reduce((acc,r)=>({revenue:acc.revenue+r.revenue,salesCount:acc.salesCount+r.salesCount}),{revenue:0,salesCount:0}),[rows]);
  const last=rows.at(-1),previous=rows.at(-2); const monthComparison=last && previous && !last.partial ? pct(last.revenue,previous.revenue) : "—";
  return <main className={s.page}>
    <AnalyticsToolbar section="Analytics" items={[]} from={draft.from} to={draft.to} channel={draft.channel}
      onFrom={v=>setDraft({...draft,from:v})} onTo={v=>setDraft({...draft,to:v})} onChannel={v=>setDraft({...draft,channel:v})} loading={loading}
      onApply={e=>{e.preventDefault();if(draft.from>draft.to){setError("Desde no puede superar Hasta.");return;}setFilter({...draft});const q=new URLSearchParams({from:draft.from,to:draft.to});if(draft.channel)q.set("channel",draft.channel);window.history.replaceState(null,"",`${window.location.pathname}?${q}`);}}/>
    {loading?<section className={s.status}>Consultando 12 meses de información comercial…</section>:error?<section className={s.error}>{error}</section>:<div className={s.content}>
      <section className={s.kpis}>
        <article><small>Ingresos · 12 meses</small><strong>{money(totals.revenue)}</strong></article>
        <article><small>Transacciones · 12 meses</small><strong>{integer(totals.salesCount)}</strong></article>
        <article><small>Ticket promedio · 12 meses</small><strong>{money(totals.salesCount?totals.revenue/totals.salesCount:0)}</strong></article>
        <article><small>Variación último mes</small><strong className={monthComparison.startsWith("-")?s.negative:s.positive}>{monthComparison}</strong><span>{last?.partial?"Mes parcial: no comparable con mes completo":"Ingresos vs. mes anterior"}</span></article>
      </section>
      <section className={s.grid}>
        <article className={s.panel}><div className={s.head}><div><h2>Evolución del negocio</h2><small>12 meses móviles · {monthLabel(monthShift(anchor,-11))} a {monthLabel(anchor)}</small></div><div className={s.switch}>{(["revenue","salesCount","averageTicket"] as Metric[]).map(m=><button key={m} className={metric===m?s.selected:""} onClick={()=>setMetric(m)}>{m==="revenue"?"Ingresos":m==="salesCount"?"Ventas":"Ticket"}</button>)}</div></div><MonthlyChart rows={rows} metric={metric}/></article>
        <article className={s.panel}><div className={s.head}><h2>Detalle mensual</h2><small>CLP · fecha comercial</small></div><div className={s.scroll}><table><thead><tr><th>Mes</th><th>Ingresos</th><th>Ventas</th><th>Ticket</th><th>Var. ingresos</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.key}><td>{r.label}{r.partial?" *":""}</td><td>{money(r.revenue)}</td><td>{integer(r.salesCount)}</td><td>{money(r.averageTicket)}</td><td className={i===0||r.partial?"":r.revenue<rows[i-1].revenue?s.negative:s.positive}>{i===0||r.partial?"—":pct(r.revenue,rows[i-1].revenue)}</td></tr>)}</tbody></table></div></article>
      </section>
      <footer>Fuente: ventas confirmadas y pagadas de Plataforma Nook · No incluye ferias fuera del POS · Ventana determinada por «Hasta» (el campo «Desde» no limita estos 12 meses) · * Mes parcial: ingresos acumulados sin comparación contra mes completo · Meses sin ventas: cero</footer>
    </div>}
  </main>;
}
