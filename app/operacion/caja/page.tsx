"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

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

export default function CashRegisterPage() {
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );

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
        setMessageType("error");
        setMessage(data.message || "No fue posible consultar la caja.");
        return;
      }

      setSession(data.session ?? null);
    } catch (error) {
      console.error("Error consultando caja:", error);

      setSession(null);
      setMessageType("error");
      setMessage("Ocurrió un error al consultar el estado de la caja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCashRegister();
  }, [loadCashRegister]);

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
      setMessageType("success");
      setMessage(data.message || "Caja abierta correctamente.");
    } catch (error) {
      console.error("Error abriendo caja:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al abrir la caja.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] px-4 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
              Abre la caja y consulta su estado operativo actual.
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

              <button
                type="button"
                onClick={() => void loadCashRegister()}
                className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Actualizar estado
              </button>
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

            <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-sm font-semibold text-violet-900">
                Próximas capacidades
              </p>

              <p className="mt-1 text-sm text-violet-700">
                Los ingresos, retiros y el cierre con cuadre se incorporarán en
                los siguientes DEV.
              </p>
            </div>
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
      </div>
    </main>
  );
}
