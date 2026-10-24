import { NextRequest, NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import type { AnalyticsFilters } from "@/types/analytics";

type Endpoint = "overview" | "products" | "flavors";
const RPC_NAMES: Record<Endpoint, string> = {
  overview: "nook_analytics_commercial_overview",
  products: "nook_analytics_commercial_products",
  flavors: "nook_analytics_commercial_flavors",
};

export async function commercialAnalyticsGet(request: NextRequest, endpoint: Endpoint) {
  try {
    const session = await getOperationSession();
    const authorization = authorizeOperationSession(session, "analytics.view");
    if (!authorization.ok) {
      return NextResponse.json({ ok: false, code: authorization.code, message: authorization.message }, { status: authorization.status });
    }

    // Validar rol activo contra BD (no confiar solo en el estado de la cookie).
    const { data: user, error: userError } = await supabaseAdmin.from("operational_users")
      .select("id,role,is_active").eq("id", authorization.session.userId).maybeSingle();
    if (userError) throw new Error("Error al validar usuario operacional");
    if (!user || !user.is_active || user.role !== authorization.session.role) {
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Sesión operacional no válida." }, { status: 403 });
    }

    const parsed = parseAnalyticsFilters(request.nextUrl.searchParams);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, code: "INVALID_FILTERS", message: parsed.message }, { status: 400 });
    }
    const filters: AnalyticsFilters = parsed.filters;

    // Validación del canal: consultar fuente canónica de canales, no aceptar códigos arbitrarios.
    if (filters.channel) {
      const { data: channel, error: channelError } = await supabaseAdmin.from("sales_channels")
        .select("code").eq("code", filters.channel).maybeSingle();
      if (channelError) throw new Error("Error al validar canal comercial");
      if (!channel) {
        return NextResponse.json({ ok: false, code: "INVALID_FILTERS", message: "Canal comercial desconocido." }, { status: 400 });
      }
    }

    const args: Record<string, string | number | null> = {
      p_from: filters.from, p_to: filters.to, p_channel: filters.channel,
    };
    if (endpoint !== "overview") args.p_top_n = filters.topN;
    if (endpoint === "products") args.p_rank_by = filters.rankBy;

    const { data, error } = await supabaseAdmin.rpc(RPC_NAMES[endpoint], args);
    if (error) {
      console.error("ANALYTICS_COMMERCIAL_RPC_ERROR", { endpoint, code: error.code });
      return NextResponse.json({ ok: false, code: "DATA_ERROR", message: "No fue posible consultar Analytics Comercial." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("ANALYTICS_COMMERCIAL_ERROR", { endpoint, error });
    return NextResponse.json({ ok: false, code: "DATA_ERROR", message: "Error interno de Analytics Comercial." }, { status: 500 });
  }
}
