import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

type CashRegisterClosedSessionRow = {
  id: number;
  status: "CLOSED";
  opened_at: string;
  opened_by_role: string;
  opening_amount: number;
  opening_notes: string | null;
  closed_at: string;
  closed_by_role: string;
  expected_cash_amount: number;
  counted_cash_amount: number;
  cash_difference: number;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeClosedSession(
  session: CashRegisterClosedSessionRow,
): CashRegisterClosedSessionRow {
  return {
    ...session,
    id: Number(session.id),
    opening_amount: Number(session.opening_amount || 0),
    expected_cash_amount: Number(session.expected_cash_amount || 0),
    counted_cash_amount: Number(session.counted_cash_amount || 0),
    cash_difference: Number(session.cash_difference || 0),
  };
}

function parseLimit(value: string | null): number {
  if (!value) {
    return 20;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return 20;
  }

  return Math.min(parsedValue, 100);
}

export async function GET(req: Request) {
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
    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));

    const { data, error, count } = await supabaseAdmin
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
        {
          count: "exact",
        },
      )
      .eq("status", "CLOSED")
      .not("closed_at", "is", null)
      .order("closed_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error("Error consultando historial de cierres:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar el historial de cierres.",
        },
        {
          status: 500,
        },
      );
    }

    const closings = ((data || []) as CashRegisterClosedSessionRow[]).map(
      normalizeClosedSession,
    );

    return NextResponse.json({
      ok: true,
      closings,
      total: Number(count || 0),
      returned: closings.length,
      limit,
    });
  } catch (error) {
    console.error("Error inesperado consultando historial de cierres:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al consultar el historial de cierres.",
      },
      {
        status: 500,
      },
    );
  }
}
