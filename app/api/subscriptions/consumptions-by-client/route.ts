import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");

    if (!clienteId) {
      return NextResponse.json(
        { message: "Falta clienteId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subscription_consumptions")
      .select(`
        id,
        potes,
        toppings,
        barquillos,
        galletas,
        created_at,
        subscriptions (
            subscription_templates (
            name
            )
        )
      `)
      .eq("cliente_id", Number(clienteId))
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { message: "Error al obtener consumos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      consumptions: data || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error inesperado" },
      { status: 500 }
    );
  }
}