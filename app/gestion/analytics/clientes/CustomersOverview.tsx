"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AnalyticsToolbar from "@/components/analytics/AnalyticsToolbar";
import s from "./customers-overview.module.css";

type Month = { month: string; registrations: number; firstBuyers: number };
type Result = { from: string; to: string; channel: string | null; registeredTotal: number; registeredNew: number;
 buyersTotal: number; buyersPeriod: number; firstBuyersPeriod: number; repeatBuyersTotal: number;
 repeatBuyersPeriod: number; active30: number; active60: number; active90: number;
 identifiedTicketsPeriod: number; identifiedRevenuePeriod: number; monthly: Month[] };
type Filters = { from: string; to: string; channel: string };
const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(n || 0);
const clp = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function initial(): Filters {
 const to = localToday(); const f: Filters = { from: `${to.slice(0,7)}-01`, to, channel: "" };
 if (typeof window !== "undefined") { const q = new URLSearchParams(window.location.search);
  const a=q.get("from"), b=q.get("to"), c=q.get("channel");
  if (a && b && /^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b) && a<=b) {f.from=a;f.to=b;}
  if (c && ["local","shopify","uber_eats","rappi"].includes(c)) f.channel=c;
 } return f;
}
const nav = [
 {label:"Resumen",href:"/gestion/analytics"},
 {label:"Ventas",href:"/gestion/analytics/comercial/ventas"},
 {label:"Productos",href:"/gestion/analytics/comercial/productos"},
 {label:"Sabores",href:"/gestion/analytics/comercial/sabores"},
 {label:"Clientes",href:"/gestion/analytics/clientes",active:true},
];
export default function CustomersOverview() {
 const [seed] = useState(initial);
 const [from,setFrom]=useState(seed.from), [to,setTo]=useState(seed.to), [channel,setChannel]=useState(seed.channel);
 const [applied,setApplied]=useState(seed);
 const [data,setData]=useState<Result|null>(null), [loading,setLoading]=useState(true), [error,setError]=useState("");
 const query=useMemo(()=>{const q=new URLSearchParams({from:applied.from,to:applied.to});if(applied.channel)q.set("channel",applied.channel);return q.toString();},[applied]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");
  fetch(`/api/analytics/customers/overview?${query}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async r=>{const v=await r.json();if(!r.ok||!v.ok)throw new Error(v.message||"Error consultando clientes");return v.data as Result;})
   .then(v=>{if(!controller.signal.aborted)setData(v);})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Error desconocido");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[query]);
 const max=Math.max(1,...(data?.monthly||[]).flatMap(m=>[m.registrations,m.firstBuyers]));
 const apply=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(from>to){setError("La fecha desde debe ser anterior o igual a hasta.");return;}setApplied({from,to,channel});const q=new URLSearchParams({from,to});if(channel)q.set("channel",channel);window.history.replaceState(null,"",`?${q}`);};
 return <main className={s.page}>
  <AnalyticsToolbar section="Analytics" items={nav} from={from} to={to} channel={channel}
    onFrom={setFrom} onTo={setTo} onChannel={setChannel} onApply={apply} loading={loading}/>

  {error && <div role="alert" className={s.error}>{error}</div>}
  {loading && <div className={s.status}>Cargando indicadores de clientes…</div>}
  {!loading && data && <>
   <section className={s.kpis}>
    <Kpi label="Clientes registrados" value={fmt(data.registeredTotal)} detail={`+${fmt(data.registeredNew)} registros en el período`}/>
    <Kpi label="Compradores identificados" value={fmt(data.buyersTotal)} detail={`${fmt(data.buyersPeriod)} compraron en el período`}/>
    <Kpi label="Primeros compradores" value={fmt(data.firstBuyersPeriod)} detail="Primera compra observada en el período"/>
    <Kpi label="Compradores recurrentes" value={fmt(data.repeatBuyersTotal)} detail={`${fmt(data.repeatBuyersPeriod)} compraron en el período`}/>
   </section>
   <section className={s.panels}>
    <article className={s.panel}><header><strong>Crecimiento mensual</strong><span>Registros vs. primeras compras</span></header>
     <div className={s.legend}><span className={s.dotA}/> Registros <span className={s.dotB}/> Primeros compradores</div>
     <div className={s.chart}>
      {data.monthly.map(m=><div key={m.month} className={s.month} title={`${m.month} · ${fmt(m.registrations)} registros · ${fmt(m.firstBuyers)} primeros compradores`}>
       <div className={s.barArea}><div className={s.barA} style={{height:`${100*m.registrations/max}%`}}/><div className={s.barB} style={{height:`${100*m.firstBuyers/max}%`}}/></div>
       <span>{m.month.slice(5)}/{m.month.slice(2,4)}</span>
      </div>)}
     </div>
    </article>
    <article className={s.panel}><header><strong>Actividad de compradores</strong><span>Ventanas móviles al {data.to}</span></header>
     <div className={s.activity}><Activity label="Últimos 30 días" value={data.active30} total={data.buyersTotal}/><Activity label="Últimos 60 días" value={data.active60} total={data.buyersTotal}/><Activity label="Últimos 90 días" value={data.active90} total={data.buyersTotal}/></div>
     <div className={s.summary}><div>Tickets identificados del período <b>{fmt(data.identifiedTicketsPeriod)}</b></div><div>Ingresos identificados del período <b>{clp(data.identifiedRevenuePeriod)}</b></div></div>
    </article>
   </section>
   <div className={s.foot}>Clientes registrados: universo global · Compras: {applied.channel || "todos los canales"} · Corte: {applied.to} · Ventanas de actividad acumulativas (30 ⊆ 60 ⊆ 90). No se atribuyen ventas anónimas a clientes. Los datos no incluyen correcciones operativas pendientes de implementar.</div>
  </>}
 </main>;
}
function Kpi({label,value,detail}:{label:string;value:string;detail:string}){return <article className={s.kpi}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;}
function Activity({label,value,total}:{label:string;value:number;total:number}){return <div className={s.activityRow}><div><span>{label}</span><b>{fmt(value)}</b></div><div className={s.track}><div style={{width:`${Math.min(100,100*value/Math.max(total,1))}%`}}/></div></div>;}
