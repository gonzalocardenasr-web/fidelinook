import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

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

function normalizeSession(
  session: CashRegisterSessionRow | null,
): CashRegisterSessionRow | null {
  if (!session) {
    return null;
  }

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

export async function GET() {
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
    const { data, error } = await supabaseAdmin
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
      .eq("status", "OPEN")
      .order("opened_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error consultando caja activa:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar el estado de la caja.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      hasOpenSession: Boolean(data),
      session: normalizeSession(data as CashRegisterSessionRow | null),
    });
  } catch (error) {
    console.error("Error inesperado consultando caja:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al consultar el estado de la caja.",
      },
      {
        status: 500,
      },
    );
  }
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

    const openingAmount = Number(body.openingAmount);

    const openingNotes =
      typeof body.openingNotes === "string"
        ? body.openingNotes.trim() || null
        : null;

    if (!Number.isInteger(openingAmount) || openingAmount < 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El fondo inicial debe ser un número entero mayor o igual a cero.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: existingSession, error: existingSessionError } =
      await supabaseAdmin
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
        .eq("status", "OPEN")
        .order("opened_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (existingSessionError) {
      console.error(
        "Error validando existencia de caja abierta:",
        existingSessionError,
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

    if (existingSession) {
      return NextResponse.json(
        {
          ok: false,
          message: "Ya existe una caja abierta.",
          session: normalizeSession(existingSession as CashRegisterSessionRow),
        },
        {
          status: 409,
        },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("cash_register_sessions")
      .insert({
        status: "OPEN",
        opened_by_role: operationSession.role,
        opening_amount: openingAmount,
        opening_notes: openingNotes,
      })
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
      .single();

    if (error) {
      /*
       * La restricción única de base de datos sigue siendo
       * la protección definitiva frente a dos aperturas simultáneas.
       */
      if (error.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            message: "Ya existe una caja abierta.",
          },
          {
            status: 409,
          },
        );
      }

      console.error("Error abriendo caja:", error);

      return NextResponse.json(
        {
          ok: false,
          message: error.message || "No fue posible abrir la caja.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        session: normalizeSession(data as CashRegisterSessionRow),
        message: "Caja abierta correctamente.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Error inesperado abriendo caja:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al abrir la caja.",
      },
      {
        status: 500,
      },
    );
  }
}
