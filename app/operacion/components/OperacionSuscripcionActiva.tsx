"use client";

import { useMemo, useState } from "react";

type SubscriptionActiva = {
  id: number;
  name: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  durationMonths: number;
  cycleNumber: number;
  cycleStartDate: string;
  cycleEndDate: string;
  incluido: {
    potes: number;
    toppings: number;
    barquillos: number;
    galletas: number;
  };
  consumido: {
    potes: number;
    toppings: number;
    barquillos: number;
    galletas: number;
  };
  disponible: {
    potes: number;
    toppings: number;
    barquillos: number;
    galletas: number;
  };
};

type Props = {
  clienteId: number;
  subscriptions: SubscriptionActiva[];
  subscriptionSeleccionada: SubscriptionActiva | null;
  cargando: boolean;
  onRefresh: () => Promise<void>;
  onMensaje: (value: string) => void;
  onSelectSubscription: (sub: SubscriptionActiva | null) => void;
};

export default function OperacionSuscripcionActiva({
  clienteId,
  subscriptions,
  subscriptionSeleccionada,
  cargando,
  onRefresh,
  onMensaje,
  onSelectSubscription,
}: Props) {
  const [potes, setPotes] = useState(0);
  const [toppings, setToppings] = useState(0);
  const [barquillos, setBarquillos] = useState(0);
  const [galletas, setGalletas] = useState(0);
  const [registrando, setRegistrando] = useState(false);
  const [abierto, setAbierto] = useState(true);

  const hayConsumoParaRegistrar = useMemo(() => {
    return potes > 0 || toppings > 0 || barquillos > 0 || galletas > 0;
  }, [potes, toppings, barquillos, galletas]);

  const erroresValidacion = useMemo(() => {
    if (!subscriptionSeleccionada) return [];

    const errores: string[] = [];

    if (
        potes > 0 &&
        subscriptionSeleccionada.incluido.potes === 0
    ) {
        errores.push("Esta suscripción no incluye potes.");
    }

    if (
        toppings > 0 &&
        subscriptionSeleccionada.incluido.toppings === 0
    ) {
        errores.push("Esta suscripción no incluye toppings.");
    }

    if (
        barquillos > 0 &&
        subscriptionSeleccionada.incluido.barquillos === 0
    ) {
        errores.push("Esta suscripción no incluye barquillos.");
    }

    if (
        galletas > 0 &&
        subscriptionSeleccionada.incluido.galletas === 0
    ) {
        errores.push("Esta suscripción no incluye galletas.");
    }

    if (
        potes > subscriptionSeleccionada.disponible.potes
    ) {
        errores.push("La cantidad de potes supera lo disponible.");
    }

    if (
        toppings > subscriptionSeleccionada.disponible.toppings
    ) {
        errores.push("La cantidad de toppings supera lo disponible.");
    }

    if (
        barquillos > subscriptionSeleccionada.disponible.barquillos
    ) {
        errores.push("La cantidad de barquillos supera lo disponible.");
    }

    if (
        galletas > subscriptionSeleccionada.disponible.galletas
    ) {
        errores.push("La cantidad de galletas supera lo disponible.");
    }

    return errores;
    }, [
    subscriptionSeleccionada,
    potes,
    toppings,
    barquillos,
    galletas,
  ]);

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) return "Sin registro";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "Sin registro";

    return date.toLocaleDateString("es-CL");
  };

  const resetForm = () => {
    setPotes(0);
    setToppings(0);
    setBarquillos(0);
    setGalletas(0);
  };

  const registrarConsumo = async () => {
    if (!subscriptionSeleccionada) {
      onMensaje("Debes seleccionar una suscripción.");
      return;
    }

    if (!hayConsumoParaRegistrar) {
      onMensaje("Debes ingresar al menos un producto para registrar consumo.");
      return;
    }

    if (erroresValidacion.length > 0) {
        onMensaje("Corrige los errores antes de registrar el consumo.");
        return;
    }

    try {
      setRegistrando(true);
      onMensaje("");

      const res = await fetch("/api/subscriptions/register-consumption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscriptionSeleccionada.id,
          clienteId,
          potes,
          toppings,
          barquillos,
          galletas,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onMensaje(data?.message || "No se pudo registrar el consumo.");
        return;
      }

      resetForm();
      await onRefresh();
      onMensaje("Consumo registrado correctamente.");
    } catch (error) {
      console.error("Error registrando consumo:", error);
      onMensaje("Ocurrió un error inesperado al registrar el consumo.");
    } finally {
      setRegistrando(false);
    }
  };

  if (cargando) {
    return (
      <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-neutral-600">
          Cargando suscripciones activas...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-violet-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-violet-700">
          Suscripciones activas
        </span>
        <span className="text-sm text-violet-700">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="border-t border-violet-100 p-5">
          {subscriptions.length === 0 ? (
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Suscripción activa
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Este cliente no tiene una suscripción activa.
              </p>
            </div>
          ) : (
            <>
              {subscriptions.length > 1 && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-violet-700">
                    Seleccionar suscripción
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    value={subscriptionSeleccionada?.id || ""}
                    onChange={(e) => {
                      const sub =
                        subscriptions.find(
                          (s) => s.id === Number(e.target.value)
                        ) || null;
                      onSelectSubscription(sub);
                      onMensaje("");
                      resetForm();
                    }}
                  >
                    {subscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} — Ciclo {sub.cycleNumber} de{" "}
                        {sub.durationMonths}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {subscriptionSeleccionada && (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-violet-700">
                        Suscripción activa
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-neutral-900">
                        {subscriptionSeleccionada.name}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-neutral-600">
                        <p>
                          Vigencia:{" "}
                          {formatearFecha(subscriptionSeleccionada.startDate)} al{" "}
                          {formatearFecha(subscriptionSeleccionada.endDate)}
                        </p>
                        <p>
                          Ciclo actual: {subscriptionSeleccionada.cycleNumber} de{" "}
                          {subscriptionSeleccionada.durationMonths}
                        </p>
                        <p>
                          Periodo del ciclo:{" "}
                          {formatearFecha(
                            subscriptionSeleccionada.cycleStartDate
                          )}{" "}
                          al{" "}
                          {formatearFecha(
                            subscriptionSeleccionada.cycleEndDate
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-violet-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                        Estado
                      </p>
                      <p className="mt-1 text-sm font-bold text-violet-700">
                        Activa
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-4 text-sm font-medium text-neutral-700">
                      Disponibilidad del ciclo actual
                    </p>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Potes
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.potes} /{" "}
                          {subscriptionSeleccionada.incluido.potes}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.potes}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Toppings
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.toppings} /{" "}
                          {subscriptionSeleccionada.incluido.toppings}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.toppings}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Barquillos
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.barquillos} /{" "}
                          {subscriptionSeleccionada.incluido.barquillos}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.barquillos}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Galletas
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.galletas} /{" "}
                          {subscriptionSeleccionada.incluido.galletas}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.galletas}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-4 text-sm font-medium text-neutral-700">
                      Registrar consumo
                    </p>

                    {erroresValidacion.length > 0 && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-sm font-semibold text-red-700">
                            Revisa lo siguiente antes de registrar:
                            </p>
                            <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                            {erroresValidacion.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Potes
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={potes}
                          onChange={(e) => setPotes(Number(e.target.value) || 0)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Toppings
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={toppings}
                          onChange={(e) =>
                            setToppings(Number(e.target.value) || 0)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Barquillos
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={barquillos}
                          onChange={(e) =>
                            setBarquillos(Number(e.target.value) || 0)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Galletas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={galletas}
                          onChange={(e) =>
                            setGalletas(Number(e.target.value) || 0)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={registrarConsumo}
                        disabled={registrando || erroresValidacion.length > 0}
                        className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {registrando ? "Registrando..." : "Registrar consumo"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}