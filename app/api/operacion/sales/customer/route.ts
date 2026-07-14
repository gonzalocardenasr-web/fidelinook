import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

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

    const saleId = Number(body.saleId);
    const customerId = Number(body.customerId);
    const reason = String(body.reason || "").trim();

    if (!Number.isInteger(saleId) || saleId <= 0) {
      return NextResponse.json(
        { ok: false, message: "La venta indicada no es válida." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        { ok: false, message: "El cliente indicado no es válido." },
        { status: 400 },
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        {
          ok: false,
          message: "El motivo no puede superar los 500 caracteres.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("assign_customer_to_sale", {
      p_sale_id: saleId,
      p_customer_id: customerId,
      p_actor_role: session.role,
      p_reason: reason || null,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 400 },
      );
    }

    const result = data && typeof data === "object" ? data : null;

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se recibió confirmación de la actualización.",
        },
        { status: 500 },
      );
    }

    const { data: updatedSale, error: updatedSaleError } = await supabaseAdmin
      .from("sales")
      .select(
        `
          id,
          customer_id,
          clientes (
            id,
            nombre,
            correo,
            telefono
          )
        `,
      )
      .eq("id", saleId)
      .single();

    if (updatedSaleError) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El cliente fue asignado, pero no se pudo recargar la venta.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      changed: Boolean(result.changed),
      sale: updatedSale,
      message: result.changed
        ? "Cliente asignado correctamente."
        : "La venta ya estaba asignada a este cliente.",
    });
  } catch (error) {
    console.error("Error asignando cliente a venta:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al asignar el cliente.",
      },
      { status: 500 },
    );
  }
}
