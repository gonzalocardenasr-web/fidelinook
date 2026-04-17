"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  auth_user_id?: string | null;
};

export default function MisSuscripcionesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState("");
  const [mostrarInfo, setMostrarInfo] = useState(false);

  useEffect(() => {
    const cargarCliente = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/mi-cuenta/suscripciones");
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, correo, telefono, auth_user_id")
        .eq("auth_user_id", userId)
        .single();

      if (error || !data) {
        setError("No encontramos una cuenta asociada a esta sesión.");
        setLoading(false);
        return;
      }

      setCliente(data as Cliente);
      setLoading(false);
    };

    cargarCliente();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <p className="text-neutral-600">Cargando suscripciones...</p>
        </div>
      </main>
    );
  }

  if (error || !cliente) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">
            Mis suscripciones
          </h1>
          <p className="mt-4 text-neutral-600">
            {error || "No fue posible cargar tus suscripciones."}
          </p>

          <button
            onClick={() => router.push("/mi-cuenta")}
            className="mt-6 rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
          >
            ← Mi cuenta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFDBEF] p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-[#4C00F7] px-6 py-6 text-white">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
              Nook
            </p>
            <h1 className="text-3xl font-bold">Mis suscripciones</h1>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div>
              <button
                onClick={() => router.push("/mi-cuenta")}
                className="rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
              >
                ← Mi cuenta
              </button>
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Cuenta
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#4C00F7]">
                {cliente.nombre}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">{cliente.correo}</p>
            </div>

            <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Estado actual
              </p>
              <p className="mt-2 text-2xl font-bold text-[#4C00F7]">
                Aún no tienes suscripciones activas
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                Aquí podrás activar y administrar tus suscripciones de helado,
                revisar tus potes disponibles y ver el estado de tus canjes.
              </p>

              <button
                type="button"
                onClick={() => setMostrarInfo((prev) => !prev)}
                className="mt-5 w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition hover:opacity-95"
              >
                {mostrarInfo ? "Ocultar información" : "Activar suscripción"}
              </button>
            </div>

            {mostrarInfo && (
              <div className="rounded-2xl border border-[#4C00F7]/15 bg-white p-5">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                  Próximamente
                </p>
                <p className="mt-2 text-lg font-semibold text-[#4C00F7]">
                  Muy pronto podrás activar tu suscripción desde aquí
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-700">
                  La idea es que compres tu suscripción en Shopify y luego la
                  actives en esta cuenta con tu número de pedido o código de
                  compra.
                </p>
              </div>
            )}
          </div>
        </div>

        <details className="overflow-hidden rounded-[24px] bg-white shadow" open>
          <summary className="cursor-pointer list-none px-6 py-5 text-xl font-bold text-[#4C00F7]">
            ¿Cómo funcionará?
          </summary>

          <div className="border-t border-neutral-200 px-6 py-5">
            <div className="space-y-4 text-sm leading-6 text-neutral-700">
              <p>
                Podrás activar una suscripción mensual, trimestral, semestral o
                anual y administrar tus potes desde esta misma cuenta.
              </p>
              <p>
                Cada mes tendrás una cantidad de potes disponibles para canjear,
                ya sea todos juntos o de a poco, antes de que venza el ciclo.
              </p>
              <p>
                Más adelante también podrás revisar aquí tus canjes, tu saldo
                disponible y el estado de tus beneficios asociados.
              </p>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}