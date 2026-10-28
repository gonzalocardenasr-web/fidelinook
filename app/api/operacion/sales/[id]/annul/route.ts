import { NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: Context) {
  const session = await getOperationSession();
  if (!session.ok) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "superadmin") {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await context.params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ ok: false, code: "INVALID_SALE_ID" }, { status: 400 });
  }
  let reason: string;
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid JSON");
    const value = (body as Record<string, unknown>).reason;
    reason = typeof value === "string" ? value.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ ok: false, code: "INVALID_REASON", message: "Motivo obligatorio (10–500 caracteres)." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc("annul_delivered_local_sale", {
    p_sale_id: saleId,
    p_reason: reason,
    p_actor_role: session.role,
    p_actor_identifier: session.userId,
  });
  if (error) {
    const knownCodes = ["SALE_NOT_FOUND", "UNSUPPORTED_CHANNEL", "SALE_NOT_CONFIRMED_PAID",
      "ORDER_RELATION_INVALID", "ORDER_NOT_DELIVERED", "LOYALTY_RECONCILIATION_REQUIRED"];
    const code = knownCodes.find((item) => error.message.includes(item));
    console.error("DELIVERED_SALE_ANNULMENT_FAILED", { saleId, code: error.code });
    return NextResponse.json({ ok: false, code: code ?? "ANNULMENT_FAILED",
      message: code === "LOYALTY_RECONCILIATION_REQUIRED"
        ? "La venta requiere conciliación de fidelización antes de anularse."
        : "No fue posible anular la venta." }, { status: code ? 409 : 500 });
  }
  return NextResponse.json({ ok: true, annulment: data });
}
