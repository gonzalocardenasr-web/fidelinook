import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { campanaId } = await req.json();

    if (!campanaId) {
      return NextResponse.json(
        { message: "Falta el ID de la campaña." },
        { status: 400 }
      );
    }

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .select("id, estado")
      .eq("id", campanaId)
      .single();

    if (campanaError || !campana) {
      return NextResponse.json(
        { message: "No se encontró la campaña." },
        { status: 404 }
      );
    }

    if (!["borrador", "fallida"].includes(campana.estado)) {
      return NextResponse.json(
        { message: "Solo se pueden lanzar campañas en estado borrador o fallida." },
        { status: 400 }
      );
    }

    const fechaLanzamiento = new Date();
    fechaLanzamiento.setMinutes(fechaLanzamiento.getMinutes() + 5);

    const { error: updateError } = await supabaseAdmin
      .from("campanas")
      .update({
        estado: "programada",
        fecha_lanzamiento: fechaLanzamiento.toISOString(),
        error_message: null,
      })
      .eq("id", campana.id);

    if (updateError) {
      console.error("Error programando lanzamiento:", updateError);
      return NextResponse.json(
        { message: "No se pudo programar el lanzamiento." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Campaña programada para lanzarse en 5 minutos.",
      fechaLanzamiento: fechaLanzamiento.toISOString(),
    });
  } catch (error) {
    console.error("Error en programar-lanzamiento:", error);
    return NextResponse.json(
      { message: "Ocurrió un error al programar la campaña." },
      { status: 500 }
    );
  }
}