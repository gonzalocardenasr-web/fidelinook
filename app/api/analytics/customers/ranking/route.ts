import { NextRequest, NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";

export async function GET(request: NextRequest) {
 try {
  const session = await getOperationSession();
  const authorization = authorizeOperationSession(session, "analytics.view");
  if (!authorization.ok) return NextResponse.json({ok:false,message:authorization.message},{status:authorization.status});
  const {data:user,error:userError}=await supabaseAdmin.from("operational_users")
   .select("id,role,is_active").eq("id",authorization.session.userId).maybeSingle();
  if (userError||!user||!user.is_active||user.role!==authorization.session.role)
   return NextResponse.json({ok:false,message:"Sesión operacional no válida."},{status:403});
  const mode=request.nextUrl.searchParams.get("mode")||"historical";
  if (!["historical","period"].includes(mode)) return NextResponse.json({ok:false,message:"Modalidad inválida."},{status:400});
  // El parser compartido valida solo los filtros comerciales.
  // Los parámetros del ranking se validan por separado más abajo.
  const filterParams = new URLSearchParams(request.nextUrl.searchParams);
  for (const key of ["mode", "sort", "search", "page"]) filterParams.delete(key);
  const parsed=parseAnalyticsFilters(filterParams);
  if (!parsed.ok) return NextResponse.json({ok:false,message:parsed.message},{status:400});
  const f=parsed.filters;
  if (f.channel) {
   const {data:channel,error:channelError}=await supabaseAdmin.from("sales_channels")
    .select("code").eq("code",f.channel).maybeSingle();
   if (channelError||!channel) return NextResponse.json({ok:false,message:"Canal desconocido."},{status:400});
  }
  const q=request.nextUrl.searchParams;
  const sort=q.get("sort")||"revenue";
  if (!["revenue","purchases","recent","ticket","stamps"].includes(sort))
   return NextResponse.json({ok:false,message:"Ordenamiento inválido."},{status:400});
  const search=(q.get("search")||"").trim();
  if (search.length>100) return NextResponse.json({ok:false,message:"Búsqueda demasiado extensa."},{status:400});
  const page=Number(q.get("page")||"1");
  if (!Number.isSafeInteger(page)||page<1||page>100000)
   return NextResponse.json({ok:false,message:"Página inválida."},{status:400});
  const rpcName=mode==="period" ? "nook_analytics_customer_ranking_period" : "nook_analytics_customer_ranking";
  const args=mode==="period"
   ? {p_from:f.from,p_cutoff:f.to,p_channel:f.channel,p_search:search||null,p_sort:sort,p_limit:30,p_offset:(page-1)*30}
   : {p_cutoff:f.to,p_channel:f.channel,p_search:search||null,p_sort:sort,p_limit:30,p_offset:(page-1)*30};
  const {data,error}=await supabaseAdmin.rpc(rpcName,args);
  if (error) {console.error("ANL_CUSTOMERS_RANKING_RPC",error.code);return NextResponse.json({ok:false,message:"No fue posible consultar el ranking."},{status:500});}
  return NextResponse.json({ok:true,data},{headers:{"Cache-Control":"private, no-store"}});
 } catch(e) {console.error("ANL_CUSTOMERS_RANKING",e);return NextResponse.json({ok:false,message:"Error interno de Analytics de Clientes."},{status:500});}
}
