import { NextResponse } from "next/server";
import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ id: string }> };

// DEV-OPS-CORR-01C.1 / Entrega 1.
// Solo lectura: no modifica ventas, pedidos, inventario, caja ni fidelización.
export async function GET(_req: Request, context: RouteContext) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHENTICATED", message: "No autenticado." },
      { status: 401 },
    );
  }

  // Las anulaciones históricas no están cubiertas por sales.operate:
  // el permiso del cajero NO es suficiente.
  if (session.role !== "superadmin") {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Sin permiso para evaluar anulaciones." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const saleId = Number(id);

  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return NextResponse.json(
      { ok: false, code: "INVALID_SALE_ID", message: "ID de venta inválido." },
      { status: 400 },
    );
  }

  try {
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .select(
        "id,sale_number,status,payment_status,channel,integration_source,external_order_id,customer_id,total,payment_method,cash_register_session_id,promotional_stamps",
      )
      .eq("id", saleId)
      .maybeSingle();

    if (saleError) throw saleError;
    if (!sale) {
      return NextResponse.json(
        { ok: false, code: "SALE_NOT_FOUND", message: "Venta no encontrada." },
        { status: 404 },
      );
    }

    const { data: orders, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id,sale_id,status,business_date,delivered_at,display_order_code")
      .eq("sale_id", saleId)
      .limit(2);
    if (orderError) throw orderError;

    const { data: redeemedRewards, error: rewardsError } = await supabaseAdmin
      .from("customer_rewards")
      .select("id")
      .eq("redeemed_sale_id", saleId)
      .eq("status", "redeemed")
      .limit(2);
    if (rewardsError) throw rewardsError;

    let cashSessionStatus: string | null = null;
    if (sale.cash_register_session_id != null) {
      const { data: cashSession, error: cashError } = await supabaseAdmin
        .from("cash_register_sessions")
        .select("status")
        .eq("id", sale.cash_register_session_id)
        .maybeSingle();
      if (cashError) throw cashError;
      cashSessionStatus = cashSession?.status ?? null;
    }

    const order = orders?.length === 1 ? orders[0] : null;
    const blockers: string[] = [];
    if (orders?.length !== 1) blockers.push("ORDER_RELATION_INVALID");
    if (order && (order.status !== "delivered" || !order.delivered_at)) {
      blockers.push("ORDER_NOT_DELIVERED");
    }
    if (sale.status !== "confirmed" || sale.payment_status !== "paid") {
      blockers.push("SALE_NOT_CONFIRMED_PAID");
    }

    return NextResponse.json({
      ok: true,
      preflight: {
        saleId: sale.id,
        saleNumber: sale.sale_number,
        orderId: order?.id ?? null,
        orderCode: order?.display_order_code ?? null,
        businessDate: order?.business_date ?? null,
        customerId: sale.customer_id,
        total: sale.total,
        paymentMethod: sale.payment_method,
        cashSessionId: sale.cash_register_session_id,
        cashSessionStatus,
        promotionalStamps: sale.promotional_stamps,
        blockers,
        structurallyEligible: blockers.length === 0,
        canExecuteAnnulment: blockers.length === 0,
        requiresFinancialTreatment: true,
        restockAutomatically: false,
      },
    });
  } catch (error) {
    console.error("ANNULMENT_PREFLIGHT_ERROR", {
      saleId,
      code: error && typeof error === "object" && "code" in error
        ? String(error.code) : "UNEXPECTED",
    });
    return NextResponse.json(
      { ok: false, code: "PREFLIGHT_ERROR", message: "No se pudo evaluar la venta." },
      { status: 500 },
    );
  }
}
