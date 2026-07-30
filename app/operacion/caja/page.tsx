"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type CashRegisterSession = {
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

type CashRegisterResponse = {
  ok: boolean;
  hasOpenSession?: boolean;
  session?: CashRegisterSession | null;
  message?: string;
};

type CashMovementType = "CASH_IN" | "CASH_OUT";

type CashMovementReason =
  | "FUND_REPLENISHMENT"
  | "AUTHORIZED_INCOME"
  | "MINOR_PURCHASE"
  | "OPERATING_EXPENSE"
  | "AUTHORIZED_WITHDRAWAL"
  | "DOCUMENTED_CORRECTION"
  | "OTHER";

type CashRegisterMovement = {
  id: number;
  cash_register_session_id: number;
  movement_type: CashMovementType;
  amount: number;
  reason: CashMovementReason;
  notes: string | null;
  created_by_role: string;
  created_at: string;
};

type CashMovementTotals = {
  cashIn: number;
  cashOut: number;
  net: number;
};

type CashMovementsResponse = {
  ok: boolean;
  hasOpenSession?: boolean;
  cashRegisterSessionId?: number | null;
  movements?: CashRegisterMovement[];
  totals?: CashMovementTotals;
  movement?: CashRegisterMovement;
  message?: string;
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

type CashClosingPreviewResponse = {
  ok: boolean;
  preview?: CashClosingPreview;
  message?: string;
};

type CashClosingResult = {
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

type CashClosingResponse = {
  ok: boolean;
  closing?: CashClosingResult;
  message?: string;
};

type CashClosingHistoryItem = {
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

type CashClosingHistoryResponse = {
  ok: boolean;
  closings?: CashClosingHistoryItem[];
  total?: number;
  returned?: number;
  limit?: number;
  message?: string;
};

const CASH_IN_REASONS: Array<{
  value: CashMovementReason;
  label: string;
}> = [
  {
    value: "FUND_REPLENISHMENT",
    label: "Reposición de fondo",
  },
  {
    value: "AUTHORIZED_INCOME",
    label: "Ingreso autorizado",
  },
  {
    value: "DOCUMENTED_CORRECTION",
    label: "Corrección documentada",
  },
  {
    value: "OTHER",
    label: "Otro",
  },
];

const CASH_OUT_REASONS: Array<{
  value: CashMovementReason;
  label: string;
}> = [
  {
    value: "MINOR_PURCHASE",
    label: "Compra menor",
  },
  {
    value: "OPERATING_EXPENSE",
    label: "Gasto operativo",
  },
  {
    value: "AUTHORIZED_WITHDRAWAL",
    label: "Retiro autorizado",
  },
  {
    value: "DOCUMENTED_CORRECTION",
    label: "Corrección documentada",
  },
  {
    value: "OTHER",
    label: "Otro",
  },
];

const REASON_LABELS: Record<CashMovementReason, string> = {
  FUND_REPLENISHMENT: "Reposición de fondo",
  AUTHORIZED_INCOME: "Ingreso autorizado",
  MINOR_PURCHASE: "Compra menor",
  OPERATING_EXPENSE: "Gasto operativo",
  AUTHORIZED_WITHDRAWAL: "Retiro autorizado",
  DOCUMENTED_CORRECTION: "Corrección documentada",
  OTHER: "Otro",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDefaultReason(movementType: CashMovementType): CashMovementReason {
  return movementType === "CASH_IN" ? "AUTHORIZED_INCOME" : "MINOR_PURCHASE";
}

export default function CashRegisterPage() {
  const [session, setSession] = useState<CashRegisterSession | null>(null);

  const [movements, setMovements] = useState<CashRegisterMovement[]>([]);
  const [movementTotals, setMovementTotals] = useState<CashMovementTotals>({
    cashIn: 0,
    cashOut: 0,
    net: 0,
  });

  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  const [movementType, setMovementType] =
    useState<CashMovementType>("CASH_OUT");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] =
    useState<CashMovementReason>("MINOR_PURCHASE");
  const [movementNotes, setMovementNotes] = useState("");
  const [showMovementForm, setShowMovementForm] = useState(false);

  const [showClosingForm, setShowClosingForm] = useState(false);
  const [countedCashAmount, setCountedCashAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [closingPreview, setClosingPreview] =
    useState<CashClosingPreview | null>(null);

  const [completedClosing, setCompletedClosing] =
    useState<CashClosingResult | null>(null);

  const [closingHistory, setClosingHistory] = useState<
    CashClosingHistoryItem[]
  >([]);

  const [loadingClosingHistory, setLoadingClosingHistory] = useState(false);

  const [loadingClosingPreview, setLoadingClosingPreview] = useState(false);
  const [submittingClosing, setSubmittingClosing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );

  const movementReasons = useMemo(
    () => (movementType === "CASH_IN" ? CASH_IN_REASONS : CASH_OUT_REASONS),
    [movementType],
  );

  const loadMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);

      const response = await fetch("/api/operacion/caja/movimientos", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CashMovementsResponse;

      if (!response.ok || !data.ok) {
        setMovements([]);
        setMovementTotals({
          cashIn: 0,
          cashOut: 0,
          net: 0,
        });

        setMessageType("error");
        setMessage(
          data.message || "No fue posible consultar los movimientos de caja.",
        );
        return;
      }

      setMovements(data.movements ?? []);
      setMovementTotals(
        data.totals ?? {
          cashIn: 0,
          cashOut: 0,
          net: 0,
        },
      );
    } catch (error) {
      console.error("Error consultando movimientos:", error);

      setMovements([]);
      setMovementTotals({
        cashIn: 0,
        cashOut: 0,
        net: 0,
      });

      setMessageType("error");
      setMessage("Ocurrió un error al consultar los movimientos de caja.");
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  const loadClosingHistory = useCallback(async () => {
    try {
      setLoadingClosingHistory(true);

      const response = await fetch("/api/operacion/caja/cierres?limit=10", {
        cache: "no-store",
      });

      const data = (await response.json()) as CashClosingHistoryResponse;

      if (!response.ok || !data.ok) {
        setClosingHistory([]);
        return;
      }

      setClosingHistory(data.closings ?? []);
    } catch (error) {
      console.error("Error consultando historial de cierres:", error);

      setClosingHistory([]);
    } finally {
      setLoadingClosingHistory(false);
    }
  }, []);

  const loadCashRegister = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CashRegisterResponse;

      if (!response.ok || !data.ok) {
        setSession(null);
        setMovements([]);
        setMovementTotals({
          cashIn: 0,
          cashOut: 0,
          net: 0,
        });

        setMessageType("error");
        setMessage(data.message || "No fue posible consultar la caja.");
        return;
      }

      const activeSession = data.session ?? null;

      setSession(activeSession);

      if (activeSession) {
        await loadMovements();
      } else {
        setMovements([]);
        setMovementTotals({
          cashIn: 0,
          cashOut: 0,
          net: 0,
        });

        resetClosingState();
      }

      await loadClosingHistory();
    } catch (error) {
      console.error("Error consultando caja:", error);

      setSession(null);
      setMovements([]);
      setMovementTotals({
        cashIn: 0,
        cashOut: 0,
        net: 0,
      });

      setMessageType("error");
      setMessage("Ocurrió un error al consultar el estado de la caja.");
    } finally {
      setLoading(false);
    }
  }, [loadMovements, loadClosingHistory]);

  useEffect(() => {
    void loadCashRegister();
  }, [loadCashRegister]);

  function selectMovementType(type: CashMovementType) {
    if (showClosingForm || loadingClosingPreview || submittingClosing) {
      return;
    }

    setMovementType(type);
    setMovementReason(getDefaultReason(type));
    setMovementAmount("");
    setMovementNotes("");
    setMessage("");
    setShowMovementForm(true);
  }

  function closeMovementForm() {
    setShowMovementForm(false);
    setMovementAmount("");
    setMovementNotes("");
    setMovementReason(getDefaultReason(movementType));
  }

  function resetClosingState() {
    setShowClosingForm(false);
    setCountedCashAmount("");
    setClosingNotes("");
    setClosingPreview(null);
    setLoadingClosingPreview(false);
    setSubmittingClosing(false);
  }

  function startClosing() {
    closeMovementForm();
    setCountedCashAmount("");
    setClosingNotes("");
    setClosingPreview(null);
    setMessage("");
    setShowClosingForm(true);
  }

  function cancelClosing() {
    if (loadingClosingPreview || submittingClosing) {
      return;
    }

    resetClosingState();
    setMessage("");
  }

  function handleCountedCashAmountChange(value: string) {
    setCountedCashAmount(value);

    /*
     * Si el conteo cambia después de calcular el resumen,
     * la previsualización deja de ser válida.
     */
    if (closingPreview) {
      setClosingPreview(null);
    }
  }

  async function previewClosing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessageType("error");
      setMessage("No existe una caja abierta para cerrar.");
      return;
    }

    const normalizedAmount = countedCashAmount.trim();
    const parsedAmount = Number(normalizedAmount);

    if (
      normalizedAmount === "" ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 0
    ) {
      setMessageType("error");
      setMessage(
        "El efectivo contado debe ser un número entero mayor o igual a cero.",
      );
      return;
    }

    try {
      setLoadingClosingPreview(true);
      setClosingPreview(null);
      setMessage("");

      const response = await fetch("/api/operacion/caja/cierre/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countedCashAmount: parsedAmount,
        }),
      });

      const data = (await response.json()) as CashClosingPreviewResponse;

      if (!response.ok || !data.ok || !data.preview) {
        setMessageType("error");
        setMessage(
          data.message ||
            "No fue posible calcular la previsualización del cierre.",
        );
        return;
      }

      if (data.preview.cashRegisterSessionId !== session.id) {
        setMessageType("error");
        setMessage(
          "La sesión de caja cambió durante el cálculo. Actualiza la página antes de continuar.",
        );
        return;
      }

      setClosingPreview(data.preview);

      setMessageType(data.preview.cashDifference === 0 ? "success" : "info");

      setMessage(
        data.message ||
          (data.preview.cashDifference === 0
            ? "El conteo coincide con el efectivo esperado."
            : "El conteo presenta una diferencia de caja."),
      );
    } catch (error) {
      console.error("Error calculando previsualización del cierre:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al calcular el cierre de caja.");
    } finally {
      setLoadingClosingPreview(false);
    }
  }

  async function confirmClosing() {
    if (!session) {
      setMessageType("error");
      setMessage("No existe una caja abierta para cerrar.");
      return;
    }

    if (!closingPreview) {
      setMessageType("error");
      setMessage("Debes revisar el conteo antes de confirmar el cierre.");
      return;
    }

    const normalizedNotes = closingNotes.trim();

    if (closingPreview.requiresNotes && !normalizedNotes) {
      setMessageType("error");
      setMessage(
        "Debes registrar una observación cuando exista una diferencia de caja.",
      );
      return;
    }

    try {
      setSubmittingClosing(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja/cierre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countedCashAmount: closingPreview.countedCashAmount,
          closingNotes: normalizedNotes,
        }),
      });

      const data = (await response.json()) as CashClosingResponse;

      if (!response.ok || !data.ok || !data.closing) {
        setMessageType("error");
        setMessage(data.message || "No fue posible cerrar la caja.");
        return;
      }

      const completedClosingResult = data.closing;

      resetClosingState();

      /*
       * El backend ya cerró la sesión. Se recarga el estado para confirmar
       * que no exista una sesión abierta y luego se conserva el comprobante
       * recibido desde el cierre transaccional.
       */
      await loadCashRegister();

      setCompletedClosing(completedClosingResult);

      setMessageType("success");
      setMessage(data.message || "Caja cerrada correctamente.");
    } catch (error) {
      console.error("Error confirmando cierre de caja:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al confirmar el cierre de caja.");
    } finally {
      setSubmittingClosing(false);
    }
  }

  function finishCompletedClosing() {
    setCompletedClosing(null);
    setMessage("");
    setOpeningAmount("");
    setOpeningNotes("");
  }

  async function openCashRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAmount = openingAmount.trim();
    const parsedAmount = Number(normalizedAmount);

    if (
      normalizedAmount === "" ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 0
    ) {
      setMessageType("error");
      setMessage(
        "El fondo inicial debe ser un número entero mayor o igual a cero.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          openingAmount: parsedAmount,
          openingNotes: openingNotes.trim(),
        }),
      });

      const data = (await response.json()) as CashRegisterResponse;

      if (!response.ok || !data.ok) {
        if (data.session) {
          setSession(data.session);
        }

        setMessageType("error");
        setMessage(data.message || "No fue posible abrir la caja.");
        return;
      }

      setSession(data.session ?? null);
      setOpeningAmount("");
      setOpeningNotes("");
      setCompletedClosing(null);
      setMovements([]);
      setMovementTotals({
        cashIn: 0,
        cashOut: 0,
        net: 0,
      });

      setMessageType("success");
      setMessage(data.message || "Caja abierta correctamente.");

      await loadMovements();
    } catch (error) {
      console.error("Error abriendo caja:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al abrir la caja.");
    } finally {
      setSubmitting(false);
    }
  }

  async function registerMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessageType("error");
      setMessage("Debes abrir la caja antes de registrar movimientos.");
      return;
    }

    const normalizedAmount = movementAmount.trim();
    const parsedAmount = Number(normalizedAmount);
    const normalizedNotes = movementNotes.trim();

    if (
      normalizedAmount === "" ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setMessageType("error");
      setMessage("El monto debe ser un número entero mayor que cero.");
      return;
    }

    if (movementReason === "OTHER" && !normalizedNotes) {
      setMessageType("error");
      setMessage("Debes explicar el motivo del movimiento.");
      return;
    }

    try {
      setSubmittingMovement(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja/movimientos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movementType,
          amount: parsedAmount,
          reason: movementReason,
          notes: normalizedNotes,
        }),
      });

      const data = (await response.json()) as CashMovementsResponse;

      if (!response.ok || !data.ok) {
        setMessageType("error");
        setMessage(
          data.message || "No fue posible registrar el movimiento de caja.",
        );
        return;
      }

      setMovementAmount("");
      setMovementNotes("");
      setMovementReason(getDefaultReason(movementType));
      setShowMovementForm(false);

      setMessageType("success");
      setMessage(data.message || "Movimiento registrado correctamente.");

      await loadMovements();
    } catch (error) {
      console.error("Error registrando movimiento:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al registrar el movimiento.");
    } finally {
      setSubmittingMovement(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white shadow-sm">
          <Link
            href="/operacion"
            className="inline-flex rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
          >
            ← Volver a Operación
          </Link>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/75">
              Gestión de caja
            </p>

            <h1 className="mt-1 text-2xl font-bold">Caja</h1>

            <p className="mt-1 text-sm text-white/85">
              Administra la apertura y los movimientos de efectivo de la
              jornada.
            </p>
          </div>
        </header>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-violet-200 bg-violet-50 text-violet-800"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-600">
              Consultando estado de la caja...
            </p>
          </section>
        ) : session ? (
          <>
            <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                    Caja abierta
                  </span>

                  <h2 className="mt-3 text-xl font-bold text-neutral-950">
                    Sesión #{session.id}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-600">
                    La operación de caja se encuentra activa.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void loadCashRegister()}
                    disabled={
                      loadingMovements ||
                      loadingClosingPreview ||
                      submittingClosing
                    }
                    className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMovements ? "Actualizando..." : "Actualizar estado"}
                  </button>

                  <button
                    type="button"
                    onClick={startClosing}
                    disabled={
                      showClosingForm ||
                      loadingMovements ||
                      loadingClosingPreview ||
                      submittingMovement ||
                      submittingClosing
                    }
                    className="cursor-pointer rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cerrar caja
                  </button>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Fondo inicial
                  </dt>

                  <dd className="mt-2 text-xl font-bold text-neutral-950">
                    {formatCurrency(session.opening_amount)}
                  </dd>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Apertura
                  </dt>

                  <dd className="mt-2 text-sm font-semibold text-neutral-900">
                    {formatDateTime(session.opened_at)}
                  </dd>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Responsable
                  </dt>

                  <dd className="mt-2 text-sm font-semibold capitalize text-neutral-900">
                    {session.opened_by_role}
                  </dd>
                </div>
              </dl>

              {session.opening_notes && (
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Observaciones de apertura
                  </p>

                  <p className="mt-2 text-sm text-neutral-700">
                    {session.opening_notes}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                    Operación del día
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-neutral-950">
                    Movimientos de efectivo
                  </h2>

                  <p className="mt-1 text-sm text-neutral-600">
                    Registra ingresos o salidas distintas de las ventas.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => selectMovementType("CASH_IN")}
                    disabled={
                      showClosingForm ||
                      loadingClosingPreview ||
                      submittingClosing
                    }
                    className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    + Registrar ingreso
                  </button>

                  <button
                    type="button"
                    onClick={() => selectMovementType("CASH_OUT")}
                    disabled={
                      showClosingForm ||
                      loadingClosingPreview ||
                      submittingClosing
                    }
                    className="cursor-pointer rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                  >
                    − Registrar salida
                  </button>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Otros ingresos
                  </dt>

                  <dd className="mt-2 text-xl font-bold text-emerald-900">
                    {formatCurrency(movementTotals.cashIn)}
                  </dd>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                    Salidas
                  </dt>

                  <dd className="mt-2 text-xl font-bold text-red-900">
                    {formatCurrency(movementTotals.cashOut)}
                  </dd>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                    Efecto neto
                  </dt>

                  <dd className="mt-2 text-xl font-bold text-violet-900">
                    {formatCurrency(movementTotals.net)}
                  </dd>
                </div>
              </dl>

              {showMovementForm && (
                <form
                  onSubmit={registerMovement}
                  className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                        Nuevo movimiento
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-neutral-950">
                        {movementType === "CASH_IN"
                          ? "Registrar ingreso de efectivo"
                          : "Registrar salida de efectivo"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={closeMovementForm}
                      className="cursor-pointer text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="movementAmount"
                        className="mb-2 block text-sm font-semibold text-neutral-800"
                      >
                        Monto
                      </label>

                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-neutral-500">
                          $
                        </span>

                        <input
                          id="movementAmount"
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={movementAmount}
                          onChange={(event) =>
                            setMovementAmount(event.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-8 pr-4 text-sm text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="movementReason"
                        className="mb-2 block text-sm font-semibold text-neutral-800"
                      >
                        Motivo
                      </label>

                      <select
                        id="movementReason"
                        value={movementReason}
                        onChange={(event) =>
                          setMovementReason(
                            event.target.value as CashMovementReason,
                          )
                        }
                        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        {movementReasons.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label
                      htmlFor="movementNotes"
                      className="mb-2 block text-sm font-semibold text-neutral-800"
                    >
                      Observaciones
                      {movementReason !== "OTHER" && (
                        <span className="ml-1 font-normal text-neutral-500">
                          opcional
                        </span>
                      )}
                    </label>

                    <textarea
                      id="movementNotes"
                      value={movementNotes}
                      onChange={(event) => setMovementNotes(event.target.value)}
                      rows={3}
                      maxLength={500}
                      required={movementReason === "OTHER"}
                      placeholder={
                        movementReason === "OTHER"
                          ? "Describe obligatoriamente el motivo."
                          : "Agrega información de respaldo cuando corresponda."
                      }
                      className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeMovementForm}
                      disabled={submittingMovement}
                      className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={submittingMovement}
                      className={`cursor-pointer rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                        movementType === "CASH_IN"
                          ? "bg-emerald-600"
                          : "bg-red-600"
                      }`}
                    >
                      {submittingMovement
                        ? "Registrando..."
                        : movementType === "CASH_IN"
                          ? "Confirmar ingreso"
                          : "Confirmar salida"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-neutral-950">
                    Historial de la sesión
                  </h3>

                  <span className="text-xs font-medium text-neutral-500">
                    {movements.length} movimiento
                    {movements.length === 1 ? "" : "s"}
                  </span>
                </div>

                {loadingMovements ? (
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-sm text-neutral-600">
                      Consultando movimientos...
                    </p>
                  </div>
                ) : movements.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                    <p className="text-sm font-semibold text-neutral-700">
                      No hay movimientos manuales registrados.
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Las ventas en efectivo no aparecen aquí porque se
                      contabilizan automáticamente en el cierre.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
                    <div className="divide-y divide-neutral-200">
                      {movements.map((movement) => {
                        const isCashIn = movement.movement_type === "CASH_IN";

                        return (
                          <article
                            key={movement.id}
                            className="flex flex-col gap-4 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="flex min-w-0 gap-3">
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                                  isCashIn
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {isCashIn ? "+" : "−"}
                              </span>

                              <div className="min-w-0">
                                <p className="font-semibold text-neutral-950">
                                  {REASON_LABELS[movement.reason]}
                                </p>

                                <p className="mt-1 text-xs text-neutral-500">
                                  {formatDateTime(movement.created_at)}
                                  {" · "}
                                  <span className="capitalize">
                                    {movement.created_by_role}
                                  </span>
                                </p>

                                {movement.notes && (
                                  <p className="mt-2 text-sm text-neutral-600">
                                    {movement.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <p
                              className={`shrink-0 text-lg font-bold ${
                                isCashIn ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {isCashIn ? "+" : "−"}
                              {formatCurrency(movement.amount)}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                    Fin de jornada
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-neutral-950">
                    Cierre de caja
                  </h2>

                  <p className="mt-1 text-sm text-neutral-600">
                    Cuenta todo el efectivo físico disponible antes de revisar
                    el cierre.
                  </p>
                </div>

                {!showClosingForm && (
                  <button
                    type="button"
                    onClick={startClosing}
                    disabled={
                      loadingMovements ||
                      submittingMovement ||
                      loadingClosingPreview ||
                      submittingClosing
                    }
                    className="cursor-pointer rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Iniciar cierre
                  </button>
                )}
              </div>

              {!showClosingForm ? (
                <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
                  <p className="text-sm font-semibold text-neutral-700">
                    La caja continúa abierta.
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    El efectivo esperado no se mostrará hasta que registres el
                    conteo físico.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    if (closingPreview) {
                      event.preventDefault();
                      return;
                    }

                    void previewClosing(event);
                  }}
                  className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                        {closingPreview ? "Paso 2 de 2" : "Paso 1 de 2"}
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-neutral-950">
                        {closingPreview ? "Revisar cierre" : "Contar efectivo"}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-600">
                        {closingPreview
                          ? "Verifica el desglose antes de confirmar el cierre definitivo."
                          : "Ingresa el total físico presente en la caja, incluyendo el fondo inicial."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={cancelClosing}
                      disabled={loadingClosingPreview || submittingClosing}
                      className="cursor-pointer text-sm font-semibold text-neutral-500 transition hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar cierre
                    </button>
                  </div>

                  {!closingPreview && (
                    <div className="mt-5">
                      <label
                        htmlFor="countedCashAmount"
                        className="mb-2 block text-sm font-semibold text-neutral-800"
                      >
                        Efectivo contado
                      </label>

                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-neutral-500">
                          $
                        </span>

                        <input
                          id="countedCashAmount"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={countedCashAmount}
                          onChange={(event) =>
                            handleCountedCashAmountChange(event.target.value)
                          }
                          placeholder="0"
                          required
                          autoFocus
                          disabled={loadingClosingPreview || submittingClosing}
                          className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-8 pr-4 text-sm text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                        />
                      </div>

                      <p className="mt-2 text-xs text-neutral-500">
                        Cuenta billetes y monedas antes de consultar el efectivo
                        esperado por el sistema.
                      </p>
                    </div>
                  )}

                  {!closingPreview && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">
                        El efectivo esperado permanece oculto
                      </p>

                      <p className="mt-1 text-xs text-amber-800">
                        Esto evita que el conteo físico sea ajustado para
                        coincidir artificialmente con el sistema.
                      </p>
                    </div>
                  )}

                  {closingPreview && (
                    <div className="mt-5 space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-neutral-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Fondo inicial
                          </p>

                          <p className="mt-2 text-lg font-bold text-neutral-950">
                            {formatCurrency(closingPreview.openingAmount)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-neutral-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Ventas en efectivo
                          </p>

                          <p className="mt-2 text-lg font-bold text-neutral-950">
                            {formatCurrency(closingPreview.cashSalesAmount)}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {closingPreview.cashSalesCount} venta
                            {closingPreview.cashSalesCount === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Otros ingresos
                          </p>

                          <p className="mt-2 text-lg font-bold text-emerald-900">
                            +{formatCurrency(closingPreview.cashInAmount)}
                          </p>

                          <p className="mt-1 text-xs text-emerald-700">
                            {closingPreview.cashInCount} movimiento
                            {closingPreview.cashInCount === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                            Salidas
                          </p>

                          <p className="mt-2 text-lg font-bold text-red-900">
                            −{formatCurrency(closingPreview.cashOutAmount)}
                          </p>

                          <p className="mt-1 text-xs text-red-700">
                            {closingPreview.cashOutCount} movimiento
                            {closingPreview.cashOutCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                            Efectivo esperado
                          </p>

                          <p className="mt-2 text-2xl font-bold text-violet-950">
                            {formatCurrency(closingPreview.expectedCashAmount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Efectivo contado
                          </p>

                          <p className="mt-2 text-2xl font-bold text-neutral-950">
                            {formatCurrency(closingPreview.countedCashAmount)}
                          </p>
                        </div>

                        <div
                          className={`rounded-2xl border p-5 ${
                            closingPreview.cashDifference === 0
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                              closingPreview.cashDifference === 0
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            Diferencia
                          </p>

                          <p
                            className={`mt-2 text-2xl font-bold ${
                              closingPreview.cashDifference === 0
                                ? "text-emerald-900"
                                : "text-red-900"
                            }`}
                          >
                            {closingPreview.cashDifference > 0 ? "+" : ""}
                            {formatCurrency(closingPreview.cashDifference)}
                          </p>

                          <p
                            className={`mt-1 text-xs ${
                              closingPreview.cashDifference === 0
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {closingPreview.cashDifference === 0
                              ? "El conteo coincide con el sistema."
                              : closingPreview.cashDifference > 0
                                ? "Existe un sobrante de efectivo."
                                : "Existe un faltante de efectivo."}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="closingNotes"
                          className="mb-2 block text-sm font-semibold text-neutral-800"
                        >
                          Observaciones del cierre
                          {!closingPreview.requiresNotes && (
                            <span className="ml-1 font-normal text-neutral-500">
                              opcional
                            </span>
                          )}
                        </label>

                        <textarea
                          id="closingNotes"
                          value={closingNotes}
                          onChange={(event) =>
                            setClosingNotes(event.target.value)
                          }
                          rows={3}
                          maxLength={500}
                          required={closingPreview.requiresNotes}
                          disabled={submittingClosing}
                          placeholder={
                            closingPreview.requiresNotes
                              ? "Explica obligatoriamente la causa conocida o probable de la diferencia."
                              : "Agrega información relevante del cierre cuando corresponda."
                          }
                          className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                        />

                        {closingPreview.requiresNotes && (
                          <p className="mt-2 text-xs font-medium text-red-700">
                            La observación es obligatoria porque existe una
                            diferencia de caja.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Confirmación definitiva
                        </p>

                        <p className="mt-1 text-xs text-amber-800">
                          Al confirmar, la sesión quedará cerrada y no será
                          posible registrar nuevas ventas ni movimientos en esta
                          caja.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    {closingPreview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setClosingPreview(null);
                            setClosingNotes("");
                            setMessage("");
                          }}
                          disabled={submittingClosing}
                          className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Volver a contar
                        </button>

                        <button
                          type="button"
                          onClick={() => void confirmClosing()}
                          disabled={submittingClosing}
                          className="cursor-pointer rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submittingClosing
                            ? "Cerrando caja..."
                            : "Confirmar cierre de caja"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={cancelClosing}
                          disabled={loadingClosingPreview || submittingClosing}
                          className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={loadingClosingPreview || submittingClosing}
                          className="cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingClosingPreview
                            ? "Calculando cierre..."
                            : "Revisar conteo"}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </section>
          </>
        ) : completedClosing ? (
          <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  Caja cerrada
                </span>

                <h2 className="mt-3 text-xl font-bold text-neutral-950">
                  Comprobante de cierre
                </h2>

                <p className="mt-1 text-sm text-neutral-600">
                  Revisa el resultado y prepara el respaldo físico del efectivo.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Sesión
                </p>

                <p className="mt-1 text-sm font-bold text-neutral-950">
                  #{completedClosing.id}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Fondo inicial
                </dt>

                <dd className="mt-2 text-lg font-bold text-neutral-950">
                  {formatCurrency(completedClosing.opening_amount)}
                </dd>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Ventas en efectivo
                </dt>

                <dd className="mt-2 text-lg font-bold text-neutral-950">
                  {formatCurrency(completedClosing.cash_sales_amount)}
                </dd>

                <p className="mt-1 text-xs text-neutral-500">
                  {completedClosing.cash_sales_count} venta
                  {completedClosing.cash_sales_count === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Otros ingresos
                </dt>

                <dd className="mt-2 text-lg font-bold text-emerald-900">
                  +{formatCurrency(completedClosing.cash_in_amount)}
                </dd>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                  Salidas
                </dt>

                <dd className="mt-2 text-lg font-bold text-red-900">
                  −{formatCurrency(completedClosing.cash_out_amount)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Efectivo esperado
                </p>

                <p className="mt-2 text-2xl font-bold text-violet-950">
                  {formatCurrency(completedClosing.expected_cash_amount)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Efectivo contado
                </p>

                <p className="mt-2 text-2xl font-bold text-neutral-950">
                  {formatCurrency(completedClosing.counted_cash_amount)}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-5 ${
                  completedClosing.cash_difference === 0
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    completedClosing.cash_difference === 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  Diferencia
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    completedClosing.cash_difference === 0
                      ? "text-emerald-900"
                      : "text-red-900"
                  }`}
                >
                  {completedClosing.cash_difference > 0 ? "+" : ""}
                  {formatCurrency(completedClosing.cash_difference)}
                </p>

                <p
                  className={`mt-1 text-xs ${
                    completedClosing.cash_difference === 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {completedClosing.cash_difference === 0
                    ? "Cierre sin diferencias."
                    : completedClosing.cash_difference > 0
                      ? "Cierre con sobrante."
                      : "Cierre con faltante."}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                Efectivo para respaldar
              </p>

              <p className="mt-2 text-3xl font-bold text-violet-950">
                {formatCurrency(completedClosing.counted_cash_amount)}
              </p>

              <p className="mt-2 text-sm text-violet-800">
                Este monto corresponde al efectivo físico declarado al cerrar la
                sesión y debe quedar asociado al comprobante o sobre de caja.
              </p>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Fecha de cierre
                </dt>

                <dd className="mt-2 text-sm font-semibold text-neutral-900">
                  {formatDateTime(completedClosing.closed_at)}
                </dd>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Responsable
                </dt>

                <dd className="mt-2 text-sm font-semibold capitalize text-neutral-900">
                  {completedClosing.closed_by_role}
                </dd>
              </div>
            </dl>

            {completedClosing.closing_notes && (
              <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Observaciones del cierre
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
                  {completedClosing.closing_notes}
                </p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Antes de finalizar
              </p>

              <p className="mt-1 text-xs text-amber-800">
                Confirma que el efectivo haya sido retirado o resguardado según
                el procedimiento operativo de Nook.
              </p>
            </div>

            <button
              type="button"
              onClick={finishCompletedClosing}
              className="mt-5 w-full cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Finalizar y volver a apertura
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div>
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Caja cerrada
              </span>

              <h2 className="mt-3 text-xl font-bold text-neutral-950">
                Abrir caja
              </h2>

              <p className="mt-1 text-sm text-neutral-600">
                Registra el fondo inicial antes de comenzar la operación.
              </p>
            </div>

            <form
              onSubmit={openCashRegister}
              className="mt-6 flex flex-col gap-5"
            >
              <div>
                <label
                  htmlFor="openingAmount"
                  className="mb-2 block text-sm font-semibold text-neutral-800"
                >
                  Fondo inicial
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-neutral-500">
                    $
                  </span>

                  <input
                    id="openingAmount"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={openingAmount}
                    onChange={(event) => setOpeningAmount(event.target.value)}
                    placeholder="0"
                    required
                    className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-8 pr-4 text-sm text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  Ingresa el efectivo físico disponible al iniciar la jornada.
                </p>
              </div>

              <div>
                <label
                  htmlFor="openingNotes"
                  className="mb-2 block text-sm font-semibold text-neutral-800"
                >
                  Observaciones
                  <span className="ml-1 font-normal text-neutral-500">
                    opcional
                  </span>
                </label>

                <textarea
                  id="openingNotes"
                  value={openingNotes}
                  onChange={(event) => setOpeningNotes(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ejemplo: fondo inicial entregado por administración."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Abriendo caja..." : "Abrir caja"}
              </button>
            </form>
          </section>
        )}

        {!loading && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                  Auditoría
                </p>

                <h2 className="mt-1 text-xl font-bold text-neutral-950">
                  Últimos cierres
                </h2>

                <p className="mt-1 text-sm text-neutral-600">
                  Consulta los últimos cierres registrados en el sistema.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-500">
                  {closingHistory.length} registro
                  {closingHistory.length === 1 ? "" : "s"}
                </span>

                <button
                  type="button"
                  onClick={() => void loadClosingHistory()}
                  disabled={loadingClosingHistory}
                  className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingClosingHistory ? "Actualizando..." : "Actualizar"}
                </button>
              </div>
            </div>

            {loadingClosingHistory ? (
              <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm text-neutral-600">
                  Consultando historial...
                </p>
              </div>
            ) : closingHistory.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
                <p className="text-sm font-semibold text-neutral-700">
                  Todavía no existen cierres registrados.
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Los cierres aparecerán aquí una vez finalizada una sesión de
                  caja.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                        Sesión
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                        Cierre
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                        Responsable
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                        Esperado
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                        Contado
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                        Diferencia
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {closingHistory.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-neutral-200 bg-white"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-neutral-950">
                          #{item.id}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                          {formatDateTime(item.closed_at)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 capitalize text-neutral-700">
                          {item.closed_by_role}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                          {formatCurrency(item.expected_cash_amount)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                          {formatCurrency(item.counted_cash_amount)}
                        </td>

                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                            item.cash_difference === 0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {item.cash_difference > 0 ? "+" : ""}
                          {formatCurrency(item.cash_difference)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
