import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clienteId, templateId } = body;

    if (!clienteId || !templateId) {
      return NextResponse.json(
        { message: "Faltan datos." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("subscription_claims")
      .insert({
        source: "admin_assigned",
        status: "pending",
        template_id: templateId,
        assigned_cliente_id: clienteId,
        created_by_admin: "superadmin",
      });

    if (error) {
      return NextResponse.json(
        { message: "Error creando asignación.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción asignada correctamente.",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error inesperado." },
      { status: 500 }
    );
  }
}