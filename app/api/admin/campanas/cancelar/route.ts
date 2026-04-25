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

    if (!["borrador", "programada", "fallida"].includes(campana.estado)) {
      return NextResponse.json(
        { message: "Solo se pueden cancelar campañas no lanzadas." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("campanas")
      .update({
        estado: "cancelada",
        cancelada_at: new Date().toISOString(),
      })
      .eq("id", campana.id);

    if (updateError) {
      console.error("Error cancelando campaña:", updateError);
      return NextResponse.json(
        { message: "No se pudo cancelar la campaña." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Campaña cancelada correctamente.",
    });
  } catch (error) {
    console.error("Error en cancelar campaña:", error);
    return NextResponse.json(
      { message: "Ocurrió un error al cancelar la campaña." },
      { status: 500 }
    );
  }
}