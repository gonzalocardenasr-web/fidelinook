import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";

export async function GET() {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }
  const authorization = authorizeOperationSession(
    session,
    "sales.operate",
  );

  if (!authorization.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: authorization.code,
        message: authorization.message,
      },
      { status: authorization.status },
    );
  }

  const businessDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });

  // Los límites UTC se calculan por separado para respetar los cambios de hora.
  function localMidnightUtc(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const localAsUtc = Date.UTC(year, month - 1, day);
    let candidate = localAsUtc;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]),
      );
      const represented = Date.UTC(
        Number(parts.year), Number(parts.month) - 1, Number(parts.day),
        Number(parts.hour), Number(parts.minute), Number(parts.second),
      );
      const correction = localAsUtc - represented;
      candidate += correction;
      if (correction === 0) break;
    }
    return new Date(candidate).toISOString();
  }

  const [year, month, day] = businessDate.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString().slice(0, 10);
  const startOfDay = localMidnightUtc(businessDate);
  const startOfTomorrow = localMidnightUtc(tomorrow);

  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .select("id, total, status, created_at")
    .gte("created_at", startOfDay)
    .lt("created_at", startOfTomorrow)
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
