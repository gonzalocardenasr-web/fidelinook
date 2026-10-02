import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";

type CashCountRow = {
  denomination: number;
  quantity: number;
};

export async function GET(req: Request) {
  const operationSession = await getOperationSession();
  const authorization = authorizeOperationSession(
    operationSession,
    "cash.operate",
  );

  if (!authorization.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: authorization.message,
      },
      {
        status: authorization.status,
      },
    );
  }

  try {
    const url = new URL(req.url);
    const requestedSessionId = Number(url.searchParams.get("sessionId"));

    if (!Number.isInteger(requestedSessionId) || requestedSessionId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El cierre indicado no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Un usuario con cash.operate puede recuperar únicamente el cierre
     * más reciente. Esto permite imprimir/reimprimir el cierre operacional
     * recién realizado sin abrir acceso al historial de auditoría.
     */
    const { data: latestClosedSession, error: latestClosedSessionError } =
      await supabaseAdmin
        .from("cash_register_sessions")
        .select(
          `
          id,
          opening_amount,
          expected_cash_amount,
          counted_cash_amount,
          cash_difference,
          closing_notes,
          closed_by_role,
          closed_at
        `,
        )
        .eq("status", "CLOSED")
        .order("closed_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (latestClosedSessionError) {
      console.error(
        "Error consultando último cierre para comprobante:",
        latestClosedSessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar el comprobante de cierre.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !latestClosedSession ||
      Number(latestClosedSession.id) !== requestedSessionId
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Este comprobante ya no está disponible desde la operación de caja.",
        },
        {
          status: 403,
        },
      );
    }

    const { data: closingCashCountData, error: closingCashCountError } =
      await supabaseAdmin
        .from("cash_register_cash_counts")
        .select("denomination, quantity")
        .eq("cash_register_session_id", requestedSessionId)
        .eq("count_type", "CLOSING")
        .order("denomination", {
          ascending: false,
        });

    if (closingCashCountError) {
      console.error(
        "Error consultando composición del cierre para comprobante:",
        closingCashCountError,
      );

      return NextResponse.json(
        {
          ok: false,
          message:
            "No fue posible consultar la composición del efectivo del cierre.",
        },
        {
          status: 500,
        },
      );
    }

    const closingCashCount = (
      (closingCashCountData || []) as CashCountRow[]
    ).map((entry) => ({
      denomination: Number(entry.denomination),
      quantity: Number(entry.quantity),
    }));

    return NextResponse.json(
      {
        ok: true,
        detail: {
          session: {
            id: Number(latestClosedSession.id),
            closed_at: latestClosedSession.closed_at,
            closed_by_role: latestClosedSession.closed_by_role,
            opening_amount: Number(latestClosedSession.opening_amount || 0),
            closing_notes: latestClosedSession.closing_notes,
          },
          summary: {
            openingAmount: Number(latestClosedSession.opening_amount || 0),
            expectedCashAmount: Number(
              latestClosedSession.expected_cash_amount || 0,
            ),
            countedCashAmount: Number(
              latestClosedSession.counted_cash_amount || 0,
            ),
            cashDifference: Number(latestClosedSession.cash_difference || 0),
          },
          closingCashCount,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Error inesperado cargando comprobante operacional de cierre:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al cargar el comprobante de cierre.",
      },
      {
        status: 500,
      },
    );
  }
}
