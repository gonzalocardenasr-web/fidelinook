"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import AnalyticsToolbar from "@/components/analytics/AnalyticsToolbar";
import s from "./segmentation.module.css";
type Row={customer_id:number;customer_name:string|null;email:string|null;purchases:number;revenue:number;average_ticket:number;last_purchase:string|null;days_since_purchase:number;r:number;f:number;m:number;segment:string};
type Summary={segment:string;customers:number;revenue:number};
type Data={cutoff:string;totalRegistered:number;buyers:number;withoutPurchases:number;summary:Summary[];items:Row[]};
type Filters={from:string;to:string;channel:string};
const fmt=(n:number)=>new Intl.NumberFormat("es-CL").format(n||0);
const clp=(n:number)=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n||0);
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const nav=[{label:"Resumen",href:"/gestion/analytics"},{label:"Ventas",href:"/gestion/analytics/comercial/ventas"},{label:"Productos",href:"/gestion/analytics/comercial/productos"},{label:"Sabores",href:"/gestion/analytics/comercial/sabores"},{label:"Clientes",href:"/gestion/analytics/clientes",active:true}];
export default function CustomersSegmentation(){
 const [seed]=useState<Filters>(()=>{const t=today();const q=typeof window!=="undefined"?new URLSearchParams(window.location.search):new URLSearchParams();return {from:q.get("from")||`${t.slice(0,7)}-01`,to:q.get("to")||t,channel:q.get("channel")||""};});
 const [from,setFrom]=useState(seed.from),[to,setTo]=useState(seed.to),[channel,setChannel]=useState(seed.channel);
 const [applied,setApplied]=useState(seed),[data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [segment,setSegment]=useState("Todos"),[search,setSearch]=useState(""),[page,setPage]=useState(1);
 const query=useMemo(()=>{const q=new URLSearchParams({from:applied.from,to:applied.to});if(applied.channel)q.set("channel",applied.channel);return q.toString();},[applied]);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError("");setData(null);fetch(`/api/analytics/customers/segmentation?${query}`,{credentials:"same-origin",cache:"no-store",signal:c.signal}).then(async r=>{const v=await r.json();if(!r.ok||!v.ok)throw new Error(v.message||"Error consultando segmentación");return v.data as Data;}).then(v=>{if(!c.signal.aborted)setData(v);}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:"Error de consulta");}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[query]);
 const filtered=useMemo(()=>{const term=search.toLocaleLowerCase("es-CL").trim();return (data?.items||[]).filter(x=>(segment==="Todos"||x.segment===segment)&&(!term||`${x.customer_name||""} ${x.email||""} ${x.customer_id}`.toLocaleLowerCase("es-CL").includes(term)));},[data,segment,search]);
 const shown=filtered.slice((page-1)*25,page*25);
 const apply=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(from>to){setError("Desde debe ser anterior o igual a Hasta.");return;}setApplied({from,to,channel});setPage(1);};
 return <main className={s.page}>
  <AnalyticsToolbar section="Analytics" items={nav} from={from} to={to} channel={channel} onFrom={setFrom} onTo={setTo} onChannel={setChannel} onApply={apply} loading={loading}/>
  {error&&<div className={s.error} role="alert">{error}</div>}
  {loading&&<div className={s.info}>Calculando distribución RFM de la cartera identificada…</div>}
  {data&&<><section className={s.cards}>
   <div><span>Compradores segmentados</span><strong>{fmt(data.buyers)}</strong></div>
   <div><span>VIP potenciales</span><strong>{fmt(data.summary.find(x=>x.segment==="VIP potencial")?.customers||0)}</strong></div>
   <div><span>Clientes en riesgo</span><strong>{fmt(data.summary.find(x=>x.segment==="En riesgo")?.customers||0)}</strong></div>
   <div><span>Registrados sin compras</span><strong>{fmt(data.withoutPurchases)}</strong></div>
  </section><section className={s.layout}><article className={s.panel}><h3>Distribución de segmentos</h3>{data.summary.map(x=><button type="button" key={x.segment} className={`${s.segment} ${segment===x.segment?s.selected:""}`} onClick={()=>{setSegment(segment===x.segment?"Todos":x.segment);setPage(1);}}><span>{x.segment}</span><div className={s.track}><div style={{width:`${data.buyers?100*x.customers/data.buyers:0}%`}}/></div><b>{fmt(x.customers)}</b><small>{clp(x.revenue)}</small></button>)}</article>
  <article className={s.panel}><div className={s.listHead}><h3>Clientes por segmento</h3><div><select aria-label="Filtrar segmento" value={segment} onChange={e=>{setSegment(e.target.value);setPage(1);}}><option>Todos</option>{data.summary.map(x=><option key={x.segment}>{x.segment}</option>)}</select><input aria-label="Buscar cliente" placeholder="Buscar cliente" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div></div><div className={s.tableWrap}><table><thead><tr><th>Cliente</th><th>Segmento</th><th>R/F/M</th><th>Compras</th><th>Facturación</th><th>Última compra</th></tr></thead><tbody>{shown.map(x=><tr key={x.customer_id}><td><strong>{x.customer_name||`Cliente #${x.customer_id}`}</strong><small>{x.email||`ID ${x.customer_id}`}</small></td><td>{x.segment}</td><td>{x.r}/{x.f}/{x.m}</td><td>{fmt(x.purchases)}</td><td>{clp(x.revenue)}</td><td>{x.last_purchase||"—"}</td></tr>)}{!shown.length&&<tr><td colSpan={6}>Sin clientes para este filtro.</td></tr>}</tbody></table></div><div className={s.pager}><span>{fmt(filtered.length)} clientes · Página {page} de {Math.max(1,Math.ceil(filtered.length/25))}</span><button disabled={page===1} onClick={()=>setPage(x=>x-1)}>Anterior</button><button disabled={page*25>=filtered.length} onClick={()=>setPage(x=>x+1)}>Siguiente</button></div></article></section></>}
  <footer className={s.footer}>Segmentación exploratoria RFM · Histórico acumulado hasta {applied.to} · Quintiles recalculados sobre compradores identificados según canal · R=recencia (5 más reciente), F=frecuencia, M=facturación · No aplica beneficios VIP · Registrados sin compras excluidos · Las categorías pueden variar al cambiar la cartera o fecha de corte.</footer>
 </main>;
}
