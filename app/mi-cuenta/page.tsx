"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  auth_user_id?: string | null;
};

export default function MiCuentaPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    const revisarSesionYCargarCliente = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/mi-cuenta");
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, correo, telefono, auth_user_id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!error && data) {
        setCliente(data as Cliente);
      }

      setLoading(false);
    };

    revisarSesionYCargarCliente();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <p className="text-neutral-600">Cargando tu cuenta...</p>
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
            <h1 className="mt-2 text-3xl font-bold leading-tight">
              Hola{cliente?.nombre ? `, ${cliente.nombre}` : ""}
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Desde aquí puedes administrar tu perfil, revisar tu tarjeta y gestionar tus suscripciones.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Resumen de tu cuenta
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4C00F7]/70">
                    Mi perfil
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#4C00F7]">
                    Tus datos de contacto
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">
                    Mantén actualizado tu nombre y teléfono.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4C00F7]/70">
                    Mi tarjeta
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#4C00F7]">
                    Tus sellos y premios
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">
                    Revisa tu progreso y tus beneficios disponibles.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4C00F7]/70">
                    Mis suscripciones
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#4C00F7]">
                    Activa y administra
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">
                    Gestiona códigos y suscripciones activas.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Ir a...
              </p>

              <div className="mt-4 space-y-3">
                <button
                  onClick={() => router.push("/mi-cuenta/perfil")}
                  className="w-full rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] px-5 py-4 text-left transition hover:opacity-95"
                >
                  <p className="text-base font-semibold text-[#4C00F7]">
                    Mi perfil
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    Edita tu nombre y teléfono.
                  </p>
                </button>

                <button
                  onClick={() => router.push("/mi-cuenta/tarjeta")}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left transition hover:bg-neutral-50"
                >
                  <p className="text-base font-semibold text-[#4C00F7]">
                    Mi tarjeta
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    Revisa tus sellos, premios y tu código QR.
                  </p>
                </button>

                <button
                  onClick={() => router.push("/mi-cuenta/suscripciones")}
                  className="w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-left transition hover:opacity-95"
                >
                  <p className="text-base font-semibold text-white">
                    Mis suscripciones
                  </p>
                  <p className="mt-1 text-sm text-white/85">
                    Activa, canjea y revisa tus suscripciones.
                  </p>
                </button>
              </div>
            </div>

            {cliente?.correo && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Cuenta asociada
                </p>
                <p className="mt-2 text-sm text-neutral-700">{cliente.correo}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}