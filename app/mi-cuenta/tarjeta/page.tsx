"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QRCode from "react-qr-code";

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

  const premiosUsados = useMemo(() => {
    if (!cliente || !Array.isArray(cliente.premios)) return [];
    return cliente.premios.filter((premio) => premio.estado === "usado");
  }, [cliente]);

  const sellos = cliente?.sellos ?? 0;
  const faltantes = Math.max(META_SELLOS - sellos, 0);
  const premioActivo = premiosActivos[0] || null;
  const urlTarjeta = `https://fidelidad.nookheladeria.cl/t/${cliente?.public_token ?? ""}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <p className="text-neutral-600">Cargando tu tarjeta...</p>
        </div>
      </main>
    );
  }

  if (error || !cliente) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">Mi tarjeta</h1>
          <p className="mt-4 text-neutral-600">
            {error || "No fue posible cargar tu tarjeta."}
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
            <h1 className="text-3xl font-bold">Tarjeta Nook</h1>
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
                    Cliente
                </p>
                <h2 className="mt-1 text-3xl font-bold text-[#4C00F7]">
                    {cliente.nombre}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">{cliente.correo}</p>
                <p className="text-sm text-neutral-600">{cliente.telefono}</p>
            </div>

                <details className="mt-2 rounded-2xl border border-[#4C00F7]/15 bg-[#FFDBEF]/40 p-5">
                    <summary className="cursor-pointer list-none text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#4C00F7] hover:opacity-80 transition">
                        Ver mi código QR
                    </summary>

                    <div className="mt-4">
                        <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-sm">
                        <QRCode value={urlTarjeta} size={180} />
                        </div>

                        <p className="mt-4 text-center text-xs text-neutral-500">
                        Muéstralo en caja para identificar tu tarjeta
                        </p>
                    </div>
                </details>

            <div className="rounded-2xl border border-[#4C00F7]/15 p-5">
              <div className="flex items-center justify-between gap-4">
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
                        : "border-[#D99BE8] bg-[#F4DCE8] text-[#4C00F7]"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {premioActivo && (
              <div className="rounded-2xl border border-[#4C00F7]/15 bg-[#4C00F7] p-5 text-white">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/80">
                  Premio disponible
                </p>
                <p className="mt-2 text-2xl font-bold">🎉 ¡Tienes un premio!</p>
                <p className="mt-1 text-lg">{premioActivo.nombre}</p>
                <p className="mt-2 text-sm text-white/80">
                  Muéstralo en el local para canjearlo.
                </p>
              </div>
            )}
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
      </div>
    </main>
  );
}