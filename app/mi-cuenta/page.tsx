"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function MiCuentaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const revisarSesion = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/mi-cuenta");
        return;
      }

      setLoading(false);
    };

    revisarSesion();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm border border-neutral-200">
          <p className="text-neutral-600">Cargando tu cuenta...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm border border-neutral-200">
        <h1 className="text-2xl font-semibold text-neutral-900">Mi cuenta</h1>
        <p className="mt-2 text-neutral-600">
          Ya ingresaste a tu cuenta privada.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          
          <a
            href="/mi-cuenta/perfil"
            className="rounded-2xl border border-neutral-200 p-5 hover:bg-neutral-50"
          >
            <h2 className="text-lg font-medium text-neutral-900">Mi perfil</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Administra tus datos de cuenta.
            </p>
          </a>

          <a
            href="/mi-cuenta/tarjeta"
            className="rounded-2xl border border-neutral-200 p-5 hover:bg-neutral-50"
          >
            <h2 className="text-lg font-medium text-neutral-900">Mi tarjeta</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Revisa tu estado actual de fidelización.
            </p>
          </a>

          <a
            href="/mi-cuenta/suscripciones"
            className="rounded-2xl border border-neutral-200 p-5 hover:bg-neutral-50"
          >
            <h2 className="text-lg font-medium text-neutral-900">
              Mis suscripciones
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Activa y revisa tus suscripciones.
            </p>
          </a>
                    
        </div>
      </div>
    </main>
  );
}