import { NextRequest, NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
export async function GET(request: NextRequest) {
  try {
    const auth = authorizeOperationSession(await getOperationSession(), "analytics.view");
    if (!auth.ok) return NextResponse.json({ok:false,message:auth.message},{status:auth.status});
    const {data:user,error:userError}=await supabaseAdmin.from("operational_users").select("id,role,is_active").eq("id",auth.session.userId).maybeSingle();
    if(userError || !user || !user.is_active || user.role !== auth.session.role) return NextResponse.json({ok:false,message:"Sesión no válida"},{status:403});
    const parsed=parseAnalyticsFilters(request.nextUrl.searchParams);
    if(!parsed.ok) return NextResponse.json({ok:false,message:parsed.message},{status:400});
    const {to,channel}=parsed.filters;
    if(channel){const {data:found,error}=await supabaseAdmin.from("sales_channels").select("code").eq("code",channel).maybeSingle();if(error||!found)return NextResponse.json({ok:false,message:"Canal no válido"},{status:400});}
    const {data,error}=await supabaseAdmin.rpc("nook_analytics_global_channels",{p_to:to,p_channel:channel});
    if(error){console.error("ANL_GLOBAL_CHANNELS_RPC",error.code);return NextResponse.json({ok:false,message:"Error al consultar canales globales"},{status:500});}
    return NextResponse.json({ok:true,data},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){console.error("ANL_GLOBAL_CHANNELS_ERROR",e);return NextResponse.json({ok:false,message:"Error interno"},{status:500});}
}
