import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data: campanas } = await supabaseAdmin
      .from("campanas")
      .select("id, nombre_interno, estado, total_enviados");

    const { data: tracking } = await supabaseAdmin
      .from("campana_clientes")
      .select("campana_id, estado");

    const resumen = (campanas || []).map((c) => {
      const registros = (tracking || []).filter(
        (t) => t.campana_id === c.id
      );

      const enviados = c.total_enviados || 0;
      const canjeados = registros.filter((r) => r.estado === "canjeado").length;
      const caducados = registros.filter((r) => r.estado === "caducado").length;

      const conversion =
        enviados > 0 ? ((canjeados / enviados) * 100).toFixed(1) : "0";

      return {
        nombre: c.nombre_interno,
        estado: c.estado,
        enviados,
        canjeados,
        caducados,
        conversion: `${conversion}%`,
      };
    });

    return NextResponse.json({ ok: true, data: resumen });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}