import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

export async function GET(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({ ok: true, clientes: [] });
  }

  const safeQuery = query.replace(/[%_]/g, "");

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select(
      "id, nombre, correo, telefono, sellos, premios, tarjeta_activa, email_verificado",
    )
    .or(
      `nombre.ilike.%${safeQuery}%,correo.ilike.%${safeQuery}%,telefono.ilike.%${safeQuery}%`,
    )
    .order("nombre", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error buscando clientes:", error);

    return NextResponse.json(
      { ok: false, message: "No se pudo buscar clientes." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    clientes: data || [],
  });
}
