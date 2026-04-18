"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Subscription = {
  id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  next_cycle_date: string | null;
  activated_at: string | null;
  created_at: string | null;
  subscription_templates?: {
    name?: string;
  } | null;
};

export default function MisSuscripcionesPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    cargarSuscripciones();
  }, []);

  const cargarSuscripciones = async () => {
    try {
      setCargando(true);
      setMensaje("");

      const clienteId = localStorage.getItem("clienteId");

      if (!clienteId) {
        setMensaje("No encontramos la sesión del cliente.");
        setSubscriptions([]);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          start_date,
          end_date,
          next_cycle_date,
          activated_at,
          created_at,
          subscription_templates:template_id ( name )
        `)
        .eq("cliente_id", Number(clienteId))
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando suscripciones:", error);
        setMensaje("No se pudieron cargar tus suscripciones.");
        setSubscriptions([]);
        return;
      }

      setSubscriptions((data || []) as Subscription[]);
    } catch (error) {
      console.error("Error inesperado cargando suscripciones:", error);
      setMensaje("Ocurrió un error inesperado al cargar tus suscripciones.");
      setSubscriptions([]);
    } finally {
      setCargando(false);
    }
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const suscripcionesVigentes = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (subscription.status !== "active") return false;
      if (!subscription.end_date) return true;

      const endDate = new Date(subscription.end_date);
      endDate.setHours(0, 0, 0, 0);

      return endDate >= hoy;
    });
  }, [subscriptions]);

  const historialSuscripciones = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (subscription.status !== "active") return true;
      if (!subscription.end_date) return false;

      const endDate = new Date(subscription.end_date);
      endDate.setHours(0, 0, 0, 0);

      return endDate < hoy;
    });
  }, [subscriptions]);

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) return "-";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-CL");
  };

  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link
            href="/mi-cuenta"
            className="text-sm text-[#454545] transition hover:opacity-70"
          >
            ← Volver a mi cuenta
          </Link>

          <span className="mt-5 inline-flex rounded-full bg-[#E1B4D0] px-3 py-1 text-sm font-medium text-[#454545]">
            Mis suscripciones
          </span>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#111111]">
            Mis suscripciones
          </h1>

          <p className="mt-3 max-w-3xl text-lg text-[#454545]">
            Revisa tus suscripciones vigentes y el historial de suscripciones anteriores.
          </p>
        </div>

        {cargando ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-600">Cargando suscripciones...</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Suscripciones vigentes</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Aquí ves solo tus suscripciones activas y vigentes.
              </p>

              {suscripcionesVigentes.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-600">
                  No tienes suscripciones vigentes en este momento.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {suscripcionesVigentes.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-[#111111]">
                            {subscription.subscription_templates?.name || "Suscripción"}
                          </p>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Inicio
                              </p>
                              <p className="mt-1 text-sm text-neutral-700">
                                {formatearFecha(subscription.start_date)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Vencimiento
                              </p>
                              <p className="mt-1 text-sm text-neutral-700">
                                {formatearFecha(subscription.end_date)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Próximo ciclo
                              </p>
                              <p className="mt-1 text-sm text-neutral-700">
                                {formatearFecha(subscription.next_cycle_date)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Estado
                              </p>
                              <p className="mt-1">
                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                  Activa
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                className="flex w-full items-center justify-between p-6 text-left transition hover:bg-neutral-50"
              >
                <div>
                  <h2 className="text-xl font-semibold">Historial de suscripciones</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Revisa tus suscripciones anteriores o vencidas.
                  </p>
                </div>

                <span className="text-2xl leading-none">
                  {mostrarHistorial ? "−" : "+"}
                </span>
              </button>

              {mostrarHistorial && (
                <div className="border-t border-neutral-200 p-6">
                  {historialSuscripciones.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      No tienes historial de suscripciones para mostrar.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {historialSuscripciones.map((subscription) => (
                        <div
                          key={subscription.id}
                          className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[#111111]">
                                {subscription.subscription_templates?.name || "Suscripción"}
                              </p>

                              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                                    Inicio
                                  </p>
                                  <p className="mt-1 text-sm text-neutral-700">
                                    {formatearFecha(subscription.start_date)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                                    Vencimiento
                                  </p>
                                  <p className="mt-1 text-sm text-neutral-700">
                                    {formatearFecha(subscription.end_date)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                                    Próximo ciclo
                                  </p>
                                  <p className="mt-1 text-sm text-neutral-700">
                                    {formatearFecha(subscription.next_cycle_date)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                                    Estado
                                  </p>
                                  <p className="mt-1">
                                    <span className="rounded-full bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700">
                                      Histórica
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {mensaje && (
          <div className="rounded-2xl bg-neutral-200 p-4 text-sm text-neutral-800">
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}