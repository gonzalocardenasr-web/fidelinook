import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../../lib/operation-auth";

type CashMovementType = "CASH_IN" | "CASH_OUT";

type CashMovementReason =
  | "FUND_REPLENISHMENT"
  | "AUTHORIZED_INCOME"
  | "MINOR_PURCHASE"
  | "OPERATING_EXPENSE"
  | "AUTHORIZED_WITHDRAWAL"
  | "DOCUMENTED_CORRECTION"
  | "OTHER";

type CashRegisterSessionRow = {
  id: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  opened_by_role: string;
  opening_amount: number;
  opening_notes: string | null;
  closed_at: string | null;
  closed_by_role: string | null;
  expected_cash_amount: number | null;
  counted_cash_amount: number | null;
  cash_difference: number | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
};

type CashRegisterMovementRow = {
  id: number;
  cash_register_session_id: number;
  movement_type: CashMovementType;
  amount: number;
  reason: CashMovementReason;
  notes: string | null;
  created_by_role: string;
  created_at: string;
};

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

function normalizeSession(
  session: CashRegisterSessionRow,
): CashRegisterSessionRow {
  return {
    ...session,
    id: Number(session.id),
    opening_amount: Number(session.opening_amount || 0),
    expected_cash_amount:
      session.expected_cash_amount === null
        ? null
        : Number(session.expected_cash_amount),
    counted_cash_amount:
      session.counted_cash_amount === null
        ? null
        : Number(session.counted_cash_amount),
    cash_difference:
      session.cash_difference === null ? null : Number(session.cash_difference),
  };
}

function normalizeMovement(
  movement: CashRegisterMovementRow,
): CashRegisterMovementRow {
  return {
    ...movement,
    id: Number(movement.id),
    cash_register_session_id: Number(movement.cash_register_session_id),
    amount: Number(movement.amount || 0),
  };
}

function normalizeExpectedCash(result: ExpectedCashResult): ExpectedCashResult {
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

export async function GET(
  _req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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
    const { id } = await context.params;
    const cashRegisterSessionId = Number(id);

    if (
      !Number.isInteger(cashRegisterSessionId) ||
      cashRegisterSessionId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Identificador de cierre inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("cash_register_sessions")
      .select(
        `
          id,
          status,
          opened_at,
          opened_by_role,
          opening_amount,
          opening_notes,
          closed_at,
          closed_by_role,
          expected_cash_amount,
          counted_cash_amount,
          cash_difference,
          closing_notes,
          created_at,
          updated_at
        `,
      )
      .eq("id", cashRegisterSessionId)
      .maybeSingle();

    if (sessionError) {
      console.error(
        "Error consultando sesión para detalle de cierre:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar el cierre de caja.",
        },
        {
          status: 500,
        },
      );
    }

    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          message: "El cierre de caja solicitado no existe.",
        },
        {
          status: 404,
        },
      );
    }

    const session = normalizeSession(sessionData as CashRegisterSessionRow);

    if (session.status !== "CLOSED" || !session.closed_at) {
      return NextResponse.json(
        {
          ok: false,
          message: "La sesión solicitada todavía no se encuentra cerrada.",
        },
        {
          status: 409,
        },
      );
    }

    const [expectedCashResult, movementsResult] = await Promise.all([
      supabaseAdmin.rpc("get_cash_register_expected_cash", {
        p_cash_register_session_id: cashRegisterSessionId,
      }),

      supabaseAdmin
        .from("cash_register_movements")
        .select(
          `
            id,
            cash_register_session_id,
            movement_type,
            amount,
            reason,
            notes,
            created_by_role,
            created_at
          `,
        )
        .eq("cash_register_session_id", cashRegisterSessionId)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (expectedCashResult.error) {
      console.error(
        "Error calculando resumen del cierre:",
        expectedCashResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible calcular el resumen del cierre.",
        },
        {
          status: 500,
        },
      );
    }

    if (movementsResult.error) {
      console.error(
        "Error consultando movimientos del cierre:",
        movementsResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar los movimientos del cierre.",
        },
        {
          status: 500,
        },
      );
    }

    const expectedCash = normalizeExpectedCash(
      expectedCashResult.data as ExpectedCashResult,
    );

    if (expectedCash.cash_register_session_id !== cashRegisterSessionId) {
      console.error("El resumen devolvió una sesión de caja diferente:", {
        requestedSessionId: cashRegisterSessionId,
        calculatedSessionId: expectedCash.cash_register_session_id,
      });

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar el resumen del cierre.",
        },
        {
          status: 500,
        },
      );
    }

    const movements = (
      (movementsResult.data || []) as CashRegisterMovementRow[]
    ).map(normalizeMovement);

    const movementTotals = movements.reduce(
      (accumulator, movement) => {
        if (movement.movement_type === "CASH_IN") {
          accumulator.cashIn += movement.amount;
          accumulator.cashInCount += 1;
        }

        if (movement.movement_type === "CASH_OUT") {
          accumulator.cashOut += movement.amount;
          accumulator.cashOutCount += 1;
        }

        return accumulator;
      },
      {
        cashIn: 0,
        cashInCount: 0,
        cashOut: 0,
        cashOutCount: 0,
      },
    );

    const summary = {
      openingAmount: session.opening_amount,
      cashSalesAmount: expectedCash.cash_sales_amount,
      cashSalesCount: expectedCash.cash_sales_count,
      cashInAmount: movementTotals.cashIn,
      cashInCount: movementTotals.cashInCount,
      cashOutAmount: movementTotals.cashOut,
      cashOutCount: movementTotals.cashOutCount,
      expectedCashAmount: Number(
        session.expected_cash_amount ?? expectedCash.expected_cash_amount,
      ),
      countedCashAmount: Number(session.counted_cash_amount ?? 0),
      cashDifference: Number(session.cash_difference ?? 0),
    };

    return NextResponse.json({
      ok: true,
      detail: {
        session,
        summary,
        movements,
      },
    });
  } catch (error) {
    console.error("Error inesperado consultando detalle de cierre:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al consultar el detalle del cierre.",
      },
      {
        status: 500,
      },
    );
  }
}
