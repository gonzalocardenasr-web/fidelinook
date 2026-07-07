import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

export async function GET() {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const businessDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });

  const startOfDay = `${businessDate}T00:00:00-04:00`;
  const endOfDay = `${businessDate}T23:59:59-04:00`;

  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .select("id, total, status, created_at")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .neq("status", "cancelled");

  if (salesError) {
    return NextResponse.json(
      { ok: false, message: salesError.message },
      { status: 500 },
    );
  }

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("id, status, business_date")
    .eq("business_date", businessDate);

  if (ordersError) {
    return NextResponse.json(
      { ok: false, message: ordersError.message },
      { status: 500 },
    );
  }

  const totalSales = sales?.length || 0;
  const totalRevenue =
    sales?.reduce((acc, sale) => acc + Number(sale.total || 0), 0) || 0;

  const pendingOrders =
    orders?.filter((order) => order.status === "pending").length || 0;

  const preparingOrders =
    orders?.filter((order) => order.status === "preparing").length || 0;

  const readyOrders =
    orders?.filter((order) => order.status === "ready").length || 0;

  const deliveredOrders =
    orders?.filter((order) => order.status === "delivered").length || 0;

  return NextResponse.json({
    ok: true,
    summary: {
      businessDate,
      totalSales,
      totalRevenue,
      pendingOrders,
      preparingOrders,
      readyOrders,
      deliveredOrders,
    },
  });
}
