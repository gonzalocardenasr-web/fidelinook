"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ClienteLogoutButton from "./components/ClienteLogoutButton";

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
      <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-neutral-600">Cargando tu cuenta...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-[#4C00F7] px-6 py-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
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

              <ClienteLogoutButton />
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Resumen de tu cuenta
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <button
                    onClick={() => router.push("/mi-cuenta/perfil")}
                    className="cursor-pointer w-full rounded-xl bg-white px-4 py-3 text-left font-semibold text-[#4C00F7] transition duration-200 hover:shadow-sm active:scale-[0.98]"
                    >
                    Mi perfil
                    </button>

                    <p className="text-xs text-neutral-600">
                    Mantén actualizado tu nombre y teléfono.
                    </p>
                </div>

                <div className="space-y-2">
                    <button
                    onClick={() => router.push("/mi-cuenta/tarjeta")}
                    className="cursor-pointer w-full rounded-xl bg-white px-4 py-3 text-left font-semibold text-[#4C00F7] transition duration-200 hover:shadow-sm active:scale-[0.98]"
                    >
                    Mi tarjeta
                    </button>

                    <p className="text-xs text-neutral-600">
                    Ve tus premios, progreso y código QR.
                    </p>
                </div>

                <div className="space-y-2">
                    <button
                    onClick={() => router.push("/mi-cuenta/suscripciones")}
                    className="cursor-pointer w-full rounded-xl bg-white px-4 py-3 text-left font-semibold text-[#4C00F7] transition duration-200 hover:shadow-sm active:scale-[0.98]"
                    >
                    Mis suscripciones
                    </button>

                    <p className="text-xs text-neutral-600">
                    Gestiona códigos y suscripciones activas.
                    </p>
                </div>
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