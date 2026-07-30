import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

type CashRegisterClosingResult = {
  id: number;
  status: "CLOSED";
  opening_amount: number;
  cash_sales_amount: number;
  cash_sales_count: number;
  cash_in_amount: number;
  cash_in_count: number;
  cash_out_amount: number;
  cash_out_count: number;
  expected_cash_amount: number;
  counted_cash_amount: number;
  cash_difference: number;
  closing_notes: string | null;
  closed_by_role: string;
  closed_at: string;
};

function normalizeClosingResult(
  result: CashRegisterClosingResult,
): CashRegisterClosingResult {
  return {
    ...result,
    id: Number(result.id),
    opening_amount: Number(result.opening_amount || 0),
    cash_sales_amount: Number(result.cash_sales_amount || 0),
    cash_sales_count: Number(result.cash_sales_count || 0),
    cash_in_amount: Number(result.cash_in_amount || 0),
    cash_in_count: Number(result.cash_in_count || 0),
    cash_out_amount: Number(result.cash_out_amount || 0),
    cash_out_count: Number(result.cash_out_count || 0),
    expected_cash_amount: Number(result.expected_cash_amount || 0),
    counted_cash_amount: Number(result.counted_cash_amount || 0),
    cash_difference: Number(result.cash_difference || 0),
  };
}

export async function POST(req: Request) {
  const operationSession = await getOperationSession();

  if (!operationSession.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autenticado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body = await req.json();

    const countedCashAmount = Number(body.countedCashAmount);

    const closingNotes =
      typeof body.closingNotes === "string"
        ? body.closingNotes.trim() || null
        : null;

    if (!Number.isInteger(countedCashAmount) || countedCashAmount < 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El efectivo contado debe ser un número entero mayor o igual a cero.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: activeSession, error: activeSessionError } =
      await supabaseAdmin
        .from("cash_register_sessions")
        .select("id, status")
        .eq("status", "OPEN")
        .order("opened_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (activeSessionError) {
      console.error(
        "Error consultando caja abierta antes del cierre:",
        activeSessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar el estado actual de la caja.",
        },
        {
          status: 500,
        },
      );
    }

    if (!activeSession) {
      return NextResponse.json(
        {
          ok: false,
          message: "No existe una caja abierta para cerrar.",
        },
        {
          status: 409,
        },
      );
    }

    const cashRegisterSessionId = Number(activeSession.id);

    if (
      !Number.isInteger(cashRegisterSessionId) ||
      cashRegisterSessionId <= 0
    ) {
      console.error("Caja abierta con identificador inválido:", activeSession);

      return NextResponse.json(
        {
          ok: false,
          message: "La sesión de caja activa no es válida.",
        },
        {
          status: 500,
        },
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "close_cash_register_session",
      {
        p_cash_register_session_id: cashRegisterSessionId,
        p_counted_cash_amount: countedCashAmount,
        p_closing_notes: closingNotes,
        p_closed_by_role: operationSession.role,
      },
    );

    if (error) {
      console.error("Error cerrando caja:", error);

      const normalizedMessage = error.message?.toLowerCase() || "";

      const isValidationError =
        normalizedMessage.includes("observación") ||
        normalizedMessage.includes("mayor o igual a cero");

      const isConflict =
        normalizedMessage.includes("ya se encuentra cerrada") ||
        normalizedMessage.includes("no existe") ||
        normalizedMessage.includes("sesión de caja no existe");

      return NextResponse.json(
        {
          ok: false,
          message: error.message || "No fue posible cerrar la caja.",
        },
        {
          status: isValidationError ? 400 : isConflict ? 409 : 500,
        },
      );
    }

    const closing = normalizeClosingResult(data as CashRegisterClosingResult);

    return NextResponse.json(
      {
        ok: true,
        closing,
        message:
          closing.cash_difference === 0
            ? "Caja cerrada correctamente y sin diferencias."
            : "Caja cerrada correctamente con una diferencia registrada.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error inesperado cerrando caja:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al cerrar la caja.",
      },
      {
        status: 500,
      },
    );
  }
}
