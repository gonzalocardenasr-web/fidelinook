import { NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };
const allowed = new Set(["efectivo", "tarjeta", "transferencia"]);

export async function POST(req: Request, context: Context) {
  const session = await getOperationSession();
  if (!session.ok) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  if (session.role !== "admin" && session.role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Sin permisos para rectificar pagos." }, { status: 403 });
  }
  const { id } = await context.params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ ok: false, message: "Venta inválida." }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud JSON inválida." }, { status: 400 });
  }
  const method = typeof body.paymentMethod === "string" ? body.paymentMethod.trim().toLowerCase() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!allowed.has(method) || reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ ok: false, message: "Medio de pago o motivo inválido (10 a 500 caracteres)." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc("correct_sale_payment_method", {
    p_sale_id: saleId,
    p_new_payment_method: method,
    p_reason: reason,
    p_actor_role: session.role,
    p_actor_identifier: null,
  });
  if (error) {
    console.error("Error rectificando medio de pago:", { saleId, code: error.code, message: error.message });
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, correction: data });
}

export async function GET(_req: Request, context: Context) {
  const session = await getOperationSession();
  if (!session.ok) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  if (session.role !== "admin" && session.role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Sin permisos." }, { status: 403 });
  }
  const { id } = await context.params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ ok: false, message: "Venta inválida." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("sale_payment_corrections")
    .select("id,sale_id,cash_register_session_id,previous_payment_method,new_payment_method,sale_total,cash_expected_delta,cash_session_status_at_change,cash_expected_stored_at_change,cash_counted_stored_at_change,cash_difference_stored_at_change,reason,actor_role,actor_identifier,created_at")
    .eq("sale_id", saleId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: "No se pudo consultar el historial." }, { status: 500 });
  return NextResponse.json({ ok: true, corrections: data ?? [] });
}
