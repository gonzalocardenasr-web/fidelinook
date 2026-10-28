import { NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: Context) {
  const session = await getOperationSession();
  if (!session.ok) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  if (session.role !== "superadmin") {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await context.params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ ok: false, code: "INVALID_SALE_ID" }, { status: 400 });
  }
  let reason: string;
  let restockInventory: boolean;
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid JSON");
    const value = (body as Record<string, unknown>).reason;
    reason = typeof value === "string" ? value.trim() : "";
    const restock = (body as Record<string, unknown>).restockInventory;
    if (typeof restock !== "boolean") throw new Error("Missing inventory decision");
    restockInventory = restock;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ ok: false, code: "INVALID_REASON", message: "Motivo obligatorio (10–500 caracteres)." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc("annul_delivered_sale", {
    p_sale_id: saleId,
    p_reason: reason,
    p_actor_role: session.role,
    p_actor_identifier: session.userId,
    p_restock_inventory: restockInventory,
  });
  if (error) {
    const knownCodes = ["SALE_NOT_FOUND", "SALE_NOT_CONFIRMED_PAID",
      "ORDER_RELATION_INVALID", "ORDER_NOT_DELIVERED", "UNSUPPORTED_DIRECT_LOYALTY_CREDIT"];
    const code = knownCodes.find((item) => error.message.includes(item));
    console.error("DELIVERED_SALE_ANNULMENT_FAILED", { saleId, code: error.code });
    return NextResponse.json({ ok: false, code: code ?? "ANNULMENT_FAILED",
      message: code === "UNSUPPORTED_DIRECT_LOYALTY_CREDIT"
        ? "La venta contiene un crédito de fidelización directo que requiere revisión administrativa."
        : "No fue posible anular la venta." }, { status: code ? 409 : 500 });
  }
  return NextResponse.json({ ok: true, annulment: data });
}
