import { NextRequest, NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";

type Buyer = {customer_id:number;customer_name:string|null;email:string|null;purchases:number;revenue:number;average_ticket:number;last_purchase:string|null;days_since_purchase:number|null};
type Ranking = {total:number;items:Buyer[]};
const BATCH=30, MAX=3000;
const score=(value:number, sorted:number[], reverse=false):number => {
 if (!sorted.length) return 1;
 // Percentiles empíricos; valores empatados reciben la misma puntuación.
 let less=0; for(const x of sorted){if(x<value)less++;else break;}
 const q=Math.min(5,1+Math.floor(5*less/sorted.length));
 return reverse?6-q:q;
};
export async function GET(request:NextRequest){
 try {
  const session=await getOperationSession();
  const auth=authorizeOperationSession(session,"analytics.view");
  if(!auth.ok)return NextResponse.json({ok:false,message:auth.message},{status:auth.status});
  const {data:user,error:userError}=await supabaseAdmin.from("operational_users").select("id,role,is_active").eq("id",auth.session.userId).maybeSingle();
  if(userError||!user||!user.is_active||user.role!==auth.session.role)return NextResponse.json({ok:false,message:"Sesión operacional no válida."},{status:403});
  const parsed=parseAnalyticsFilters(request.nextUrl.searchParams);
  if(!parsed.ok)return NextResponse.json({ok:false,message:parsed.message},{status:400});
  const f=parsed.filters;
  if(f.channel){const {data:c,error:e}=await supabaseAdmin.from("sales_channels").select("code").eq("code",f.channel).maybeSingle();if(e||!c)return NextResponse.json({ok:false,message:"Canal desconocido."},{status:400});}
  const fetchPage=async(offset:number):Promise<Ranking>=>{
   const {data,error}=await supabaseAdmin.rpc("nook_analytics_customer_ranking",{p_cutoff:f.to,p_channel:f.channel,p_search:null,p_sort:"revenue",p_limit:BATCH,p_offset:offset});
   if(error)throw new Error(`RPC ${error.code||"unknown"}`);
   const result=data as Ranking|null;
   if(!result||!Array.isArray(result.items)||!Number.isInteger(Number(result.total)))throw new Error("Respuesta inesperada del ranking");
   return result;
  };
  const first=await fetchPage(0);
  const total=Number(first.total);
  if(total>MAX)return NextResponse.json({ok:false,message:"La base supera el límite temporal de segmentación. Se requiere una RPC dedicada antes de continuar."},{status:409});
  const all=[...first.items];
  const offsets=Array.from({length:Math.max(0,Math.ceil(total/BATCH)-1)},(_,i)=>(i+1)*BATCH);
  for(let i=0;i<offsets.length;i+=4){const batch=await Promise.all(offsets.slice(i,i+4).map(fetchPage));for(const part of batch)all.push(...part.items);}
  if(all.length!==total||new Set(all.map(x=>x.customer_id)).size!==total)throw new Error("Paginación inconsistente; no se clasificó la base");
  const buyers=all.filter(x=>Number(x.purchases)>0&&x.days_since_purchase!==null);
  const recencies=buyers.map(x=>Number(x.days_since_purchase)).sort((a,b)=>a-b);
  const frequencies=buyers.map(x=>Number(x.purchases)).sort((a,b)=>a-b);
  const revenues=buyers.map(x=>Number(x.revenue)).sort((a,b)=>a-b);
  const segments=["VIP potencial","En riesgo","Frecuente","Alto valor","Nuevo","Ocasional"];
  const rows=buyers.map(x=>{
   const r=score(Number(x.days_since_purchase),recencies,true);
   const fr=score(Number(x.purchases),frequencies);
   const m=score(Number(x.revenue),revenues);
   let segment="Ocasional";
   if(r>=4&&fr>=4&&m>=4)segment="VIP potencial";
   else if(r<=2&&(fr>=4||m>=4))segment="En riesgo";
   else if(fr>=4)segment="Frecuente";
   else if(m>=4)segment="Alto valor";
   else if(Number(x.purchases)<=2&&r>=4)segment="Nuevo";
   return {...x,r,f:fr,m,segment};
  }).sort((a,b)=>Number(b.revenue)-Number(a.revenue));
  const summary=segments.map(segment=>{const group=rows.filter(x=>x.segment===segment);return {segment,customers:group.length,revenue:group.reduce((a,x)=>a+Number(x.revenue),0)};});
  return NextResponse.json({ok:true,data:{cutoff:f.to,channel:f.channel,totalRegistered:total,buyers:buyers.length,withoutPurchases:total-buyers.length,summary,items:rows,method:"Quintiles empíricos históricos al corte; categorías exploratorias"}},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){console.error("ANL_CUSTOMERS_SEGMENTATION",e);return NextResponse.json({ok:false,message:"No fue posible calcular la segmentación. Revisa los registros del servidor."},{status:500});}
}
