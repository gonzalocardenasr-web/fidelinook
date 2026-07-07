import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

export async function PATCH(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const body = await req.json();

  const optionValueId = Number(body.optionValueId);
  const name = String(body.name || "").trim();
  const isActive = Boolean(body.isActive);

  if (!optionValueId || Number.isNaN(optionValueId)) {
    return NextResponse.json(
      { ok: false, message: "Opción inválida." },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "El nombre es obligatorio." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("catalog_option_values")
    .update({
      name,
      is_active: isActive,
    })
    .eq("id", optionValueId);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
