"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Premio = {
  id: number;
  nombre: string;
  estado: "activo" | "usado";
  vencimiento?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  sellos: number;
  premios: Premio[] | null;
  public_token: string;
  tarjeta_activa?: boolean;
  email_verificado?: boolean;
  auth_user_id?: string | null;
};

const META_SELLOS = 7;

export default function MiTarjetaPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarTarjeta = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/mi-cuenta/tarjeta");
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("auth_user_id", userId)
        .single();

      if (error || !data) {
        setError("No encontramos una tarjeta asociada a esta cuenta.");
        setLoading(false);
        return;
      }

      setCliente(data as Cliente);
      setLoading(false);
    };

    cargarTarjeta();
  }, [router]);

  const premiosActivos = useMemo(() => {
    if (!cliente || !Array.isArray(cliente.premios)) return [];
    return cliente.premios.filter((premio) => premio.estado === "activo");
  }, [cliente]);

  const premioActivo = premiosActivos[0] || null;
  const sellos = cliente?.sellos ?? 0;
  const faltantes = Math.max(META_SELLOS - sellos, 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF7FB] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-6 shadow">
          <p className="text-neutral-600">Cargando tu tarjeta...</p>
        </div>
      </main>
    );
  }

  if (error || !cliente) {
    return (
      <main className="min-h-screen bg-[#FFF7FB] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">Mi tarjeta</h1>
          <p className="mt-4 text-neutral-600">
            {error || "No fue posible cargar tu tarjeta."}
          </p>

          <button
            onClick={() => router.push("/mi-cuenta")}
            className="mt-6 rounded-2xl bg-[#4C00F7] px-5 py-3 text-sm font-semibold text-white"
          >
            Volver a mi cuenta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF7FB] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-gradient-to-r from-[#4C00F7] to-[#6A1BFF] px-6 py-6 text-white md:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Nook
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">
              Mi tarjeta
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Revisa tu estado actual de fidelización.
            </p>
          </div>

        <div className="px-6 pt-4 md:px-8">
          <button
            onClick={() => router.push("/mi-cuenta")}
            className="rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
          >
            ← Mi cuenta
        </button>
        </div>
          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Cliente
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#4C00F7]">
                {cliente.nombre}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">{cliente.correo}</p>
              <p className="text-sm text-neutral-600">{cliente.telefono}</p>
            </div>

            <div className="rounded-2xl border border-[#4C00F7]/15 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    Progreso actual
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#4C00F7]">
                    {sellos} de {META_SELLOS} sellos
                  </p>
                </div>

                <div className="rounded-full bg-[#4C00F7] px-4 py-2 text-sm font-semibold text-white">
                  {faltantes} para tu premio
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2">
                {[...Array(META_SELLOS)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${
                      i < sellos
                        ? "border-[#4C00F7] bg-[#4C00F7] text-white"
                        : "border-[#4C00F7]/25 bg-[#FFDBEF] text-[#4C00F7]"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {premioActivo ? (
              <div className="rounded-2xl border border-[#4C00F7]/15 bg-[#4C00F7] p-5 text-white">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/80">
                  Premio disponible
                </p>
                <p className="mt-2 text-2xl font-bold">🎉 ¡Tienes un premio!</p>
                <p className="mt-1 text-lg">{premioActivo.nombre}</p>
                <p className="mt-2 text-sm text-white/80">
                  {premioActivo.vencimiento
                    ? `Vence: ${premioActivo.vencimiento}`
                    : "Disponible para canje en el local."}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Premio
                </p>
                <p className="mt-2 text-neutral-700">
                  Aún no tienes un premio activo.
                </p>
              </div>
            )}
            
          </div>
        </div>
      </div>
      <details className="overflow-hidden rounded-[24px] bg-white shadow" open>
        <summary className="cursor-pointer list-none px-6 py-5 text-xl font-bold text-[#4C00F7]">
            Premios activos
        </summary>

        <div className="border-t border-neutral-200 px-6 py-5">
            {premiosActivos.length === 0 ? (
            <p className="text-neutral-600">No tienes premios activos.</p>
            ) : (
            <div className="space-y-3">
                {premiosActivos.map((premio) => (
                <div
                    key={premio.id}
                    className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-4"
                >
                    <p className="font-semibold text-[#4C00F7]">
                    {premio.nombre}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                    Estado: {premio.estado}
                    </p>
                    <p className="text-sm text-neutral-600">
                    Vence: {premio.vencimiento || "Sin definir"}
                    </p>
                </div>
                ))}
            </div>
            )}
        </div>
        </details>

        <details className="overflow-hidden rounded-[24px] bg-white shadow">
            <summary className="cursor-pointer list-none px-6 py-5 text-xl font-bold text-[#4C00F7]">
                Historial de premios usados
            </summary>

            <div className="border-t border-neutral-200 px-6 py-5">
                {premiosUsados.length === 0 ? (
                <p className="text-neutral-600">
                    Todavía no has canjeado premios.
                </p>
                ) : (
                <div className="space-y-3">
                    {premiosUsados.map((premio) => (
                    <div
                        key={premio.id}
                        className="rounded-2xl border border-neutral-200 p-4"
                    >
                        <p className="font-semibold text-[#4C00F7]">
                        {premio.nombre}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                        Estado: {premio.estado}
                        </p>
                        <p className="text-sm text-neutral-600">
                        Vencía: {premio.vencimiento || "Sin definir"}
                        </p>
                    </div>
                    ))}
                </div>
                )}
            </div>
        </details>
    </main>
  );
}