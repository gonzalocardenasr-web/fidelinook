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

  const sales: Array<{ id: number; total: number | null; customer_id: number | null }> = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseAdmin
      .from("sales")
      .select("id, total, customer_id")
      .gte("created_at", startOfDay)
      .lt("created_at", startOfTomorrow)
      .neq("status", "cancelled")
      .order("id", { ascending: true }).range(from, from + 499);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    sales.push(...(data || []));
    if ((data || []).length < 500) break;
    if (from >= 99500) return NextResponse.json({ ok: false, message: "Límite de ventas alcanzado." }, { status: 500 });
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

  // Indicadores de fidelización: consultar exclusivamente eventos canónicos.
  // Cada consulta tiene paginación explícita para evitar el límite por defecto de PostgREST.
  async function fetchAllRows<T>(makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const all: T[] = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const result = await makeQuery(from, from + pageSize - 1);
      if (result.error) throw new Error(result.error.message);
      const batch = result.data || [];
      all.push(...batch);
      if (batch.length < pageSize) return all;
      if (from >= 99500) throw new Error("Límite de paginación de indicadores alcanzado.");
    }
  }

  let newCustomers: number;
  let stampsIssued: number;
  let expiringRewards: number;
  let rewardsIssued: number;
  let rewardsRedeemed: number;
  try {
    const [customersToday, positiveMovements, rewardsSoon, issuedToday, redeemedToday] = await Promise.all([
      fetchAllRows<{ id: number }>((from, to) =>
        supabaseAdmin.from("clientes").select("id")
          .gte("created_At", startOfDay).lt("created_At", startOfTomorrow)
          .order("id", { ascending: true }).range(from, to)),
      fetchAllRows<{ stamp_delta: number }>((from, to) =>
        supabaseAdmin.from("loyalty_movements").select("stamp_delta")
          .gt("stamp_delta", 0)
          .gte("occurred_at", startOfDay).lt("occurred_at", startOfTomorrow)
          .order("occurred_at", { ascending: true }).range(from, to)),
      fetchAllRows<{ id: number }>((from, to) =>
        supabaseAdmin.from("customer_rewards").select("id")
          .eq("status", "active")
          .not("expires_at", "is", null)
          .gte("expires_at", new Date().toISOString())
          .lt("expires_at", new Date(Date.now() + 6 * 86400000).toISOString())
          .order("expires_at", { ascending: true }).range(from, to)),
      fetchAllRows<{ id: number }>((from, to) =>
        supabaseAdmin.from("customer_rewards").select("id")
          .gte("issued_at", startOfDay).lt("issued_at", startOfTomorrow)
          .order("id", { ascending: true }).range(from, to)),
      fetchAllRows<{ id: number }>((from, to) =>
        supabaseAdmin.from("customer_rewards").select("id")
          .eq("status", "redeemed")
          .gte("redeemed_at", startOfDay).lt("redeemed_at", startOfTomorrow)
          .order("id", { ascending: true }).range(from, to)),
    ]);
    newCustomers = customersToday.length;
    stampsIssued = positiveMovements.reduce((sum, movement) => sum + Number(movement.stamp_delta || 0), 0);
    expiringRewards = rewardsSoon.length;
    rewardsIssued = issuedToday.length;
    rewardsRedeemed = redeemedToday.length;
  } catch (error) {
    console.error("OPERATION_SUMMARY_LOYALTY_METRICS_ERROR", error);
    return NextResponse.json({ ok: false, message: "No se pudieron calcular los indicadores de fidelización." }, { status: 500 });
  }

  const identifiedSales = (sales || []).filter((sale) => sale.customer_id !== null).length;
  const identifiedRevenue = (sales || []).reduce((sum, sale) =>
    sum + (sale.customer_id !== null ? Number(sale.total || 0) : 0), 0);

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
      identifiedSales,
      identifiedRevenue,
      newCustomers,
      stampsIssued,
      expiringRewards,
      rewardsIssued,
      rewardsRedeemed,
      pendingOrders,
      preparingOrders,
      readyOrders,
      deliveredOrders,
    },
  });
}
