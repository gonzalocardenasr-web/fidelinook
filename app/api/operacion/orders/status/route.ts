import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

const allowedStatuses = [
  "pending",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const orderId = Number(body.orderId);
    const newStatus = String(body.newStatus || "").trim();
    const notes = body.notes ? String(body.notes) : null;

    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json(
        { ok: false, message: "orderId inválido." },
        { status: 400 },
      );
    }

    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, message: "Estado inválido." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("update_order_status", {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_actor_role: session.role,
      p_notes: notes,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      result: data,
    });
  } catch (error) {
    console.error("Error actualizando pedido:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al actualizar pedido." },
      { status: 500 },
    );
  }
}
