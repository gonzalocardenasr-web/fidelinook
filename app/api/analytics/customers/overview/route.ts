import { NextRequest, NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";

export async function GET(request: NextRequest) {
  try {
    const session = await getOperationSession();
    const authorization = authorizeOperationSession(session, "analytics.view");
    if (!authorization.ok) return NextResponse.json({ ok: false, message: authorization.message }, { status: authorization.status });
    const { data: user, error: userError } = await supabaseAdmin.from("operational_users")
      .select("id,role,is_active").eq("id", authorization.session.userId).maybeSingle();
    if (userError || !user || !user.is_active || user.role !== authorization.session.role)
      return NextResponse.json({ ok: false, message: "Sesión operacional no válida." }, { status: 403 });
    const parsed = parseAnalyticsFilters(request.nextUrl.searchParams);
    if (!parsed.ok) return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
    const f = parsed.filters;
    if (f.channel) {
      const { data: channel, error: channelError } = await supabaseAdmin.from("sales_channels")
        .select("code").eq("code", f.channel).maybeSingle();
      if (channelError || !channel) return NextResponse.json({ ok: false, message: "Canal desconocido." }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.rpc("nook_analytics_customers_overview", {
      p_from: f.from, p_to: f.to, p_channel: f.channel,
    });
    if (error) {
      console.error("ANL_CUSTOMERS_OVERVIEW_RPC", error.code);
      return NextResponse.json({ ok: false, message: "No fue posible consultar Analytics de Clientes." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("ANL_CUSTOMERS_OVERVIEW", error);
    return NextResponse.json({ ok: false, message: "Error interno de Analytics de Clientes." }, { status: 500 });
  }
}
