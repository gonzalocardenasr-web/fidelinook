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
            <h1 className="text-3xl font-bold">Mi cuenta</h1>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Bienvenido
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#4C00F7]">
                {cliente?.nombre || "Tu cuenta"}
              </h2>
              {cliente?.correo && (
                <p className="mt-2 text-sm text-neutral-600">{cliente.correo}</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Tu espacio Nook
              </p>
              <p className="mt-2 text-lg font-semibold text-[#4C00F7]">
                Desde aquí puedes administrar tu tarjeta, tus datos y tus suscripciones
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                Usa los accesos directos de abajo para navegar por tu cuenta.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Accesos rápidos
            </h2>

            <div className="mt-5 grid gap-3">
              <button
                onClick={() => router.push("/mi-cuenta/tarjeta")}
                className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] px-5 py-4 text-left text-sm font-semibold text-[#4C00F7] transition hover:opacity-95"
              >
                Mi tarjeta
              </button>

              <button
                onClick={() => router.push("/mi-cuenta/suscripciones")}
                className="rounded-2xl bg-[#4C00F7] px-5 py-4 text-left text-sm font-semibold text-white transition hover:opacity-95"
              >
                Mis suscripciones
              </button>

              <button
                onClick={() => router.push("/mi-cuenta/perfil")}
                className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left text-sm font-semibold text-[#4C00F7] transition hover:bg-neutral-50"
              >
                Mi perfil
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}