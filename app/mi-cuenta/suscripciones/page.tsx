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

  const [codigo, setCodigo] = useState("");
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [mensajeActivacion, setMensajeActivacion] = useState("");

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

  const handleCanjearCodigo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!codigo.trim()) {
      setMensajeCodigo("Debes ingresar un código.");
      return;
    }

    setMensajeCodigo(
      "Esta sección ya quedó lista visualmente. En el siguiente paso conectaremos el canje real del código."
    );
  };

  const handleActivarAsignada = () => {
    setMensajeActivacion(
      "Aquí mostraremos las suscripciones disponibles para activar cuando conectemos el modelo real."
    );
  };

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
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Activar suscripción
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Aquí aparecerán las suscripciones que fueron cargadas directamente
              a tu cuenta y que están pendientes de activación.
            </p>

            <div className="mt-5 rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Pendientes por activar
              </p>
              <p className="mt-2 text-lg font-semibold text-[#4C00F7]">
                Aún no tienes suscripciones directas para activar
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                Cuando compres una suscripción por caja, WhatsApp, teléfono o
                cualquier otro canal y esta quede asociada a tu cuenta, la
                verás aquí para activarla.
              </p>

              <button
                type="button"
                onClick={handleActivarAsignada}
                className="mt-5 w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition hover:opacity-95"
              >
                Buscar suscripciones disponibles
              </button>

              {mensajeActivacion && (
                <div className="mt-4 rounded-2xl border border-[#D99BE8] bg-white px-4 py-3 text-sm text-neutral-700">
                  {mensajeActivacion}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Canjear código
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Si recibiste un código de suscripción por compra web o como
              regalo, podrás canjearlo aquí.
            </p>

            <form onSubmit={handleCanjearCodigo} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Código
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base uppercase text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Ingresa tu código"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition hover:opacity-95"
              >
                Canjear código
              </button>

              {mensajeCodigo && (
                <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] px-4 py-3 text-sm text-neutral-700">
                  {mensajeCodigo}
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Ver mis suscripciones
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Aquí verás el detalle de tus suscripciones activas, lo consumido,
              la fecha de renovación del ciclo y tus beneficios vigentes.
            </p>

            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-500">
                Suscripciones vigentes
              </p>
              <p className="mt-2 text-lg font-semibold text-[#4C00F7]">
                Aún no tienes suscripciones activas
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                Cuando actives una suscripción, aquí podrás revisar su detalle,
                el saldo del ciclo actual, lo que ya consumiste y la fecha en
                que se renueva.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}