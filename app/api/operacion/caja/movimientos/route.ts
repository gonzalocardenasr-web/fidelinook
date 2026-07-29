import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

type CashMovementType = "CASH_IN" | "CASH_OUT";

type CashMovementReason =
  | "FUND_REPLENISHMENT"
  | "AUTHORIZED_INCOME"
  | "MINOR_PURCHASE"
  | "OPERATING_EXPENSE"
  | "AUTHORIZED_WITHDRAWAL"
  | "DOCUMENTED_CORRECTION"
  | "OTHER";

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

const CASH_IN_REASONS = new Set<CashMovementReason>([
  "FUND_REPLENISHMENT",
  "AUTHORIZED_INCOME",
  "DOCUMENTED_CORRECTION",
  "OTHER",
]);

const CASH_OUT_REASONS = new Set<CashMovementReason>([
  "MINOR_PURCHASE",
  "OPERATING_EXPENSE",
  "AUTHORIZED_WITHDRAWAL",
  "DOCUMENTED_CORRECTION",
  "OTHER",
]);

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

async function getOpenCashRegisterSession() {
  return supabaseAdmin
    .from("cash_register_sessions")
    .select("id, status")
    .eq("status", "OPEN")
    .order("opened_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();
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
    const { data: openSession, error: openSessionError } =
      await getOpenCashRegisterSession();

    if (openSessionError) {
      console.error(
        "Error consultando caja abierta para movimientos:",
        openSessionError,
      );

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

    if (!openSession) {
      return NextResponse.json({
        ok: true,
        hasOpenSession: false,
        cashRegisterSessionId: null,
        movements: [],
        totals: {
          cashIn: 0,
          cashOut: 0,
          net: 0,
        },
      });
    }

    const cashRegisterSessionId = Number(openSession.id);

    const { data, error } = await supabaseAdmin
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
        ascending: false,
      });

    if (error) {
      console.error("Error consultando movimientos de caja:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible consultar los movimientos de caja.",
        },
        {
          status: 500,
        },
      );
    }

    const movements = ((data || []) as CashRegisterMovementRow[]).map(
      normalizeMovement,
    );

    const totals = movements.reduce(
      (accumulator, movement) => {
        if (movement.movement_type === "CASH_IN") {
          accumulator.cashIn += movement.amount;
        }

        if (movement.movement_type === "CASH_OUT") {
          accumulator.cashOut += movement.amount;
        }

        return accumulator;
      },
      {
        cashIn: 0,
        cashOut: 0,
      },
    );

    return NextResponse.json({
      ok: true,
      hasOpenSession: true,
      cashRegisterSessionId,
      movements,
      totals: {
        ...totals,
        net: totals.cashIn - totals.cashOut,
      },
    });
  } catch (error) {
    console.error("Error inesperado consultando movimientos de caja:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al consultar los movimientos de caja.",
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

    const movementType =
      typeof body.movementType === "string"
        ? body.movementType.trim().toUpperCase()
        : "";

    const amount = Number(body.amount);

    const reason =
      typeof body.reason === "string" ? body.reason.trim().toUpperCase() : "";

    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (movementType !== "CASH_IN" && movementType !== "CASH_OUT") {
      return NextResponse.json(
        {
          ok: false,
          message: "Tipo de movimiento inválido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El monto debe ser un número entero mayor que cero.",
        },
        {
          status: 400,
        },
      );
    }

    const normalizedReason = reason as CashMovementReason;

    const allowedReasons =
      movementType === "CASH_IN" ? CASH_IN_REASONS : CASH_OUT_REASONS;

    if (!allowedReasons.has(normalizedReason)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            movementType === "CASH_IN"
              ? "Motivo de ingreso inválido."
              : "Motivo de salida inválido.",
        },
        {
          status: 400,
        },
      );
    }

    if (normalizedReason === "OTHER" && !notes) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes explicar el motivo del movimiento.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: openSession, error: openSessionError } =
      await getOpenCashRegisterSession();

    if (openSessionError) {
      console.error(
        "Error validando caja abierta antes del movimiento:",
        openSessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar el estado de la caja.",
        },
        {
          status: 500,
        },
      );
    }

    if (!openSession) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes abrir la caja antes de registrar movimientos.",
        },
        {
          status: 409,
        },
      );
    }

    const cashRegisterSessionId = Number(openSession.id);

    const { data, error } = await supabaseAdmin.rpc(
      "create_cash_register_movement",
      {
        p_cash_register_session_id: cashRegisterSessionId,
        p_movement_type: movementType,
        p_amount: amount,
        p_reason: normalizedReason,
        p_notes: notes,
        p_created_by_role: operationSession.role,
      },
    );

    if (error) {
      console.error("Error registrando movimiento de caja:", error);

      const normalizedMessage = error.message?.toLowerCase() || "";

      const isClosedCashRegister =
        normalizedMessage.includes("caja cerrada") ||
        normalizedMessage.includes("no se pueden registrar movimientos");

      return NextResponse.json(
        {
          ok: false,
          message:
            error.message || "No fue posible registrar el movimiento de caja.",
        },
        {
          status: isClosedCashRegister ? 409 : 500,
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        movement: data,
        message:
          movementType === "CASH_IN"
            ? "Ingreso de efectivo registrado correctamente."
            : "Salida de efectivo registrada correctamente.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Error inesperado registrando movimiento de caja:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al registrar el movimiento de caja.",
      },
      {
        status: 500,
      },
    );
  }
}
