"use client";
import dashboardFrame from "@/components/analytics/dashboard-frame.module.css";
import { useEffect, useMemo, useState } from "react";
import AnalyticsToolbar from "@/components/analytics/AnalyticsToolbar";
import s from "./channels.module.css";
type Filter = { from: string; to: string; channel: string };
type Channel = { code: string; name: string; tickets: number; revenue: number; averageTicket: number; identifiedTickets: number; share: number };
type Daily = { date: string; channel: string; tickets: number; revenue: number };
type Data = { totals: { tickets: number; revenue: number; averageTicket: number }; channels: Channel[]; daily: Daily[] };
const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n);
const percent = (n: number) => new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 1 }).format(n);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const initial = (): Filter => {
  const t = today(); const fallback = { from: `${t.slice(0, 7)}-01`, to: t, channel: "" };
  if (typeof window === "undefined") return fallback;
  const q = new URLSearchParams(window.location.search);
  const date = (v: string | null, def: string) => v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : def;
  const c = q.get("channel") || "";
  return { from: date(q.get("from"), fallback.from), to: date(q.get("to"), fallback.to), channel: ["local", "shopify", "uber_eats", "rappi"].includes(c) ? c : "" };
};
const colors = ["#4f46e5", "#0891b2", "#f59e0b", "#10b981", "#a855f7", "#e11d48"];
function DailyChart({ rows, channels, metric }: { rows: Daily[]; channels: Channel[]; metric: "revenue" | "tickets" }) {
  const dates = [...new Set(rows.map(r => r.date))].sort();
  const w = 920, h = 270, left = 83, right = 28, top = 20, bottom = 42;
  const max = Math.max(1, ...rows.map(r => r[metric]));
  const x = (i: number) => left + (dates.length < 2 ? (w - left - right) / 2 : i * (w - left - right) / (dates.length - 1));
  const y = (n: number) => h - bottom - n / max * (h - top - bottom);
  const ticks = Math.max(1, Math.ceil(dates.length / 7));
  return <svg className={s.chart} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Evolución diaria por canal">
    {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1={left} x2={w-right} y1={y(max*f)} y2={y(max*f)} stroke="#e2e8f0"/><text x={left-10} y={y(max*f)+4} textAnchor="end" fontSize="13" fill="#64748b">{metric==="revenue" ? `${(max*f/1e6).toFixed(1)} M` : num(Math.round(max*f))}</text></g>)}
    {channels.map((c, ci) => {
      const map = new Map(rows.filter(r => r.channel===c.code).map(r => [r.date,r[metric]]));
      const pts = dates.map((d,i) => `${x(i)},${y(map.get(d)||0)}`).join(" ");
      return dates.length > 1 ? <polyline key={c.code} points={pts} fill="none" stroke={colors[ci%colors.length]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/> : <circle key={c.code} cx={x(0)} cy={y(map.get(dates[0])||0)} r="5" fill={colors[ci%colors.length]}/>;
    })}
    {dates.map((d,i) => {
      const leftEdge = i===0 ? left : (x(i-1)+x(i))/2;
      const rightEdge = i===dates.length-1 ? w-right : (x(i)+x(i+1))/2;
      const entries = channels.map(c => ({c, value: rows.find(r => r.date===d && r.channel===c.code)?.[metric] ?? 0}));
      const total = entries.reduce((sum,e)=>sum+e.value,0);
      const format = (value:number) => metric === "revenue" ? money(value) : `${num(value)} transacciones`;
      return <rect key={`hover-${d}`} x={leftEdge} y={top} width={Math.max(1,rightEdge-leftEdge)} height={h-top-bottom} fill="transparent" style={{cursor:"crosshair"}}>
        <title>{`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}\n${entries.map(e=>`${e.c.name}: ${format(e.value)}`).join("\n")}\nTotal: ${format(total)}`}</title>
      </rect>;
    })}
    {dates.map((d,i) => (i%ticks===0||i===dates.length-1) ? <text key={d} x={x(i)} y={h-12} textAnchor="middle" fontSize="12" fill="#64748b">{d.slice(8)}/{d.slice(5,7)}</text> : null)}
  </svg>;
}
export default function Channels() {
  const [draft,setDraft] = useState<Filter>(initial), [filter,setFilter] = useState<Filter>(initial);
  const [data,setData] = useState<Data|null>(null), [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [metric,setMetric] = useState<"revenue"|"tickets">("revenue");
  const q = useMemo(() => { const p = new URLSearchParams({from:filter.from,to:filter.to}); if(filter.channel)p.set("channel",filter.channel);return p.toString(); },[filter]);
  useEffect(() => {
    const ac = new AbortController();setLoading(true);setError("");setData(null);
    fetch(`/api/analytics/commercial/channels?${q}`,{signal:ac.signal,cache:"no-store"})
      .then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.message||`HTTP ${r.status}`);return j.data as Data;})
      .then(d=>{if(!ac.signal.aborted)setData(d);})
      .catch(e=>{if(!ac.signal.aborted)setError(e instanceof Error?e.message:"Error de consulta");})
      .finally(()=>{if(!ac.signal.aborted)setLoading(false);});
    return ()=>ac.abort();
  },[q]);
  const channels=data?.channels||[];
  const leader=channels[0];
  const digital=channels.filter(c=>c.code!=="local").reduce((a,c)=>a+c.revenue,0);
  return <main className={`${s.page} ${dashboardFrame.frame}`}>
    <AnalyticsToolbar section="Ventas" from={draft.from} to={draft.to} channel={draft.channel}
      onFrom={v=>setDraft({...draft,from:v})} onTo={v=>setDraft({...draft,to:v})} onChannel={v=>setDraft({...draft,channel:v})}
      loading={loading} items={[
        {label:"Resumen",href:`/gestion/analytics?${q}`},
        {label:"Evolución",href:`/gestion/analytics/comercial/ventas?${q}`},
        {label:"Temporalidad",href:`/gestion/analytics/comercial/ventas/temporalidad?${q}`},
        {label:"Canales",href:`/gestion/analytics/comercial/ventas/canales?${q}`,active:true},
        {label:"Productos",href:`/gestion/analytics/comercial/productos?${q}`}
      ]} onApply={e=>{e.preventDefault();if(draft.from>draft.to){setError("La fecha inicial no puede superar la final.");return;}setFilter({...draft});const p=new URLSearchParams({from:draft.from,to:draft.to});if(draft.channel)p.set("channel",draft.channel);window.history.replaceState(null,"",`${window.location.pathname}?${p}`);}}/>
    {loading?<div className={s.notice}>Cargando canales…</div>:error?<div className={s.error}>{error}</div>:data?<div className={s.body}>
      <section className={s.kpis}>
        <article><small>Ingresos</small><strong>{money(data.totals.revenue)}</strong><span>Ventas confirmadas y pagadas</span></article>
        <article><small>Transacciones</small><strong>{num(data.totals.tickets)}</strong><span>Canales seleccionados</span></article>
        <article><small>Ticket promedio</small><strong>{money(data.totals.averageTicket)}</strong><span>Ingresos / transacciones</span></article>
        <article><small>{filter.channel?"Canal seleccionado":"Canal líder"}</small><strong>{leader?.name||"—"}</strong><span>{leader?percent(leader.share)+" de ingresos":"Sin ventas"}</span></article>
      </section>
      <section className={s.grid}>
        <article className={s.card}>
          <div className={s.heading}><h2>Participación por canal</h2><span>Ingresos del período</span></div>
          <div className={s.channels}>{channels.map((c,i)=><div className={s.channel} key={c.code}>
            <div className={s.channelTitle}><b>{c.name}</b><b>{percent(c.share)}</b></div>
            <div className={s.track}><div style={{width:`${Math.max(0,Math.min(100,c.share*100))}%`,background:colors[i%colors.length]}}/></div>
            <div className={s.channelMeta}><strong>{money(c.revenue)}</strong><span>{num(c.tickets)} ventas · Ticket {money(c.averageTicket)}</span></div>
          </div>)}</div>
          <p className={s.note}>Participación sobre ingresos del filtro actual. No representa margen ni rentabilidad.</p>
          {!filter.channel&&<div className={s.callout}>Ingresos digitales: <b>{money(digital)}</b> · {percent(data.totals.revenue?digital/data.totals.revenue:0)}</div>}
        </article>
        <article className={s.card}>
          <div className={s.heading}><h2>Evolución por canal</h2><div className={s.toggle}><button className={metric==="revenue"?s.active:""} onClick={()=>setMetric("revenue")}>Ingresos</button><button className={metric==="tickets"?s.active:""} onClick={()=>setMetric("tickets")}>Transacciones</button></div></div>
          <DailyChart rows={data.daily} channels={channels} metric={metric}/>
          <div className={s.legend}>{channels.map((c,i)=><span key={c.code}><i style={{background:colors[i%colors.length]}}/>{c.name}</span>)}</div>
          <p className={s.note}>Fecha comercial de Santiago · Días sin ventas incluidos como cero.</p>
        </article>
      </section>
      <section className={s.tableCard}><div className={s.heading}><h2>Comparativo de canales</h2><span>Ordenados por ingresos</span></div><div className={s.tableWrap}><table><thead><tr><th>Canal</th><th>Ingresos</th><th>Participación</th><th>Ventas</th><th>Ticket promedio</th><th>Identificadas</th></tr></thead><tbody>{channels.map(c=><tr key={c.code}><td>{c.name}</td><td>{money(c.revenue)}</td><td>{percent(c.share)}</td><td>{num(c.tickets)}</td><td>{money(c.averageTicket)}</td><td>{num(c.identifiedTickets)}</td></tr>)}</tbody></table></div></section>
      <footer>Ingresos según ventas pagadas y confirmadas · Canales comerciales · Sin costos ni comisiones · Sin estimaciones</footer>
    </div>:null}
  </main>;
}
