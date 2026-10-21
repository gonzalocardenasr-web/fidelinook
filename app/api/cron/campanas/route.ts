import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { aplicarCampana } from "@/lib/campaigns/campaignExecutor";
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("Missing CRON_SECRET environment variable");

      return NextResponse.json(
        {
          ok: false,
          message: "Configuracion de seguridad incompleta.",
        },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          ok: false,
          message: "No autorizado.",
        },
        { status: 401 }
      );
    }
    const ahora = new Date().toISOString();

    const { data: campanas, error } = await supabaseAdmin
      .from("campanas")
      .select("*")
      .eq("estado", "programada")
      .lte("fecha_lanzamiento", ahora);

    if (error) {
      console.error("Error buscando campañas:", error);
      return NextResponse.json({ ok: false });
    }

    let totalProcesadas = 0;

    for (const campana of campanas || []) {
      try {
        await aplicarCampana({
          campanaId: campana.id,
          duracionHoras: Number(campana.duracion_horas),
          actorRole: "system",
        });
        totalProcesadas++;
      } catch (err) {
        console.error("Error aplicando campaña:", campana.id, err);

      }
    }

    return NextResponse.json({
      ok: true,
      totalProcesadas,
    });
  } catch (err) {
    console.error("Error cron campañas:", err);
    return NextResponse.json({ ok: false });
  }
}
