import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

function generarCodigo() {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NOOK-${random}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { message: "Falta templateId." },
        { status: 400 }
      );
    }

    const code = generarCodigo();

    const { error } = await supabaseAdmin
      .from("subscription_claims")
      .insert({
        source: "admin_code",
        status: "pending",
        template_id: templateId,
        claim_code: code,
        created_by_admin: "superadmin",
      });

    if (error) {
      return NextResponse.json(
        { message: "Error generando código.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      code,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error inesperado." },
      { status: 500 }
    );
  }
}