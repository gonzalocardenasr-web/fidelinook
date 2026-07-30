import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../../lib/operation-auth";

type ExpectedCashResult = {
  cash_register_session_id: number;
  session_status: "OPEN" | "CLOSED";
  opening_amount: number;
  cash_sales_amount: number;
  cash_sales_count: number;
  cash_in_amount: number;
  cash_in_count: number;
  cash_out_amount: number;
  cash_out_count: number;
  expected_cash_amount: number;
};

type CashClosingPreview = {
  cashRegisterSessionId: number;
  openingAmount: number;
  cashSalesAmount: number;
  cashSalesCount: number;
  cashInAmount: number;
  cashInCount: number;
  cashOutAmount: number;
  cashOutCount: number;
  expectedCashAmount: number;
  countedCashAmount: number;
  cashDifference: number;
  requiresNotes: boolean;
};

function normalizeExpectedCashResult(
  result: ExpectedCashResult,
): ExpectedCashResult {
  return {
    cash_register_session_id: Number(result.cash_register_session_id),
    session_status: result.session_status,
    opening_amount: Number(result.opening_amount || 0),
    cash_sales_amount: Number(result.cash_sales_amount || 0),
    cash_sales_count: Number(result.cash_sales_count || 0),
    cash_in_amount: Number(result.cash_in_amount || 0),
    cash_in_count: Number(result.cash_in_count || 0),
    cash_out_amount: Number(result.cash_out_amount || 0),
    cash_out_count: Number(result.cash_out_count || 0),
    expected_cash_amount: Number(result.expected_cash_amount || 0),
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
        "Error consultando caja abierta para previsualizar cierre:",
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
      "get_cash_register_expected_cash",
      {
        p_cash_register_session_id: cashRegisterSessionId,
      },
    );

    if (error) {
      console.error("Error calculando previsualización del cierre:", error);

      const normalizedMessage = error.message?.toLowerCase() || "";

      const isConflict =
        normalizedMessage.includes("no existe") ||
        normalizedMessage.includes("sesión de caja no existe");

      return NextResponse.json(
        {
          ok: false,
          message:
            error.message ||
            "No fue posible calcular la previsualización del cierre.",
        },
        {
          status: isConflict ? 409 : 500,
        },
      );
    }

    const expectedCash = normalizeExpectedCashResult(
      data as ExpectedCashResult,
    );

    if (expectedCash.session_status !== "OPEN") {
      return NextResponse.json(
        {
          ok: false,
          message: "La caja ya no se encuentra abierta.",
        },
        {
          status: 409,
        },
      );
    }

    if (expectedCash.cash_register_session_id !== cashRegisterSessionId) {
      console.error("La previsualización devolvió una sesión diferente:", {
        activeSessionId: cashRegisterSessionId,
        calculatedSessionId: expectedCash.cash_register_session_id,
      });

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar el cálculo de cierre de la caja.",
        },
        {
          status: 500,
        },
      );
    }

    const cashDifference =
      countedCashAmount - expectedCash.expected_cash_amount;

    const preview: CashClosingPreview = {
      cashRegisterSessionId,
      openingAmount: expectedCash.opening_amount,
      cashSalesAmount: expectedCash.cash_sales_amount,
      cashSalesCount: expectedCash.cash_sales_count,
      cashInAmount: expectedCash.cash_in_amount,
      cashInCount: expectedCash.cash_in_count,
      cashOutAmount: expectedCash.cash_out_amount,
      cashOutCount: expectedCash.cash_out_count,
      expectedCashAmount: expectedCash.expected_cash_amount,
      countedCashAmount,
      cashDifference,
      requiresNotes: cashDifference !== 0,
    };

    return NextResponse.json({
      ok: true,
      preview,
      message:
        cashDifference === 0
          ? "El conteo coincide con el efectivo esperado."
          : "El conteo presenta una diferencia de caja.",
    });
  } catch (error) {
    console.error("Error inesperado previsualizando cierre de caja:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al calcular la previsualización del cierre.",
      },
      {
        status: 500,
      },
    );
  }
}
