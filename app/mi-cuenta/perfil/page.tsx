"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  auth_user_id?: string | null;
};

export default function MiPerfilPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarPerfil = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/mi-cuenta/perfil");
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, correo, telefono, auth_user_id")
        .eq("auth_user_id", userId)
        .single();

      if (error || !data) {
        setError("No encontramos un perfil asociado a esta cuenta.");
        setLoading(false);
        return;
      }

      const cliente = data as Cliente;

      setClienteId(cliente.id);
      setNombre(cliente.nombre || "");
      setCorreo(cliente.correo || "");
      setTelefono(cliente.telefono || "");
      setLoading(false);
    };

    cargarPerfil();
  }, [router]);

  const inicial = useMemo(() => {
    return nombre?.trim()?.charAt(0)?.toUpperCase() || "N";
  }, [nombre]);

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clienteId) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    const { error } = await supabase
      .from("clientes")
      .update({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      })
      .eq("id", clienteId);

    if (error) {
      setError("No se pudo guardar tu perfil. Inténtalo nuevamente.");
      setGuardando(false);
      return;
    }

    setMensaje("Tu perfil fue actualizado correctamente.");
    setGuardando(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <p className="text-neutral-600">Cargando tu perfil...</p>
        </div>
      </main>
    );
  }

  if (error && !clienteId) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">Mi perfil</h1>
          <p className="mt-4 text-neutral-600">{error}</p>

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
            <h1 className="text-3xl font-bold">Mi perfil</h1>
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

            <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4C00F7] text-2xl font-bold text-white">
                  {inicial}
                </div>

                <div>
                  <p className="text-2xl font-bold text-[#4C00F7]">{nombre}</p>
                  <p className="mt-1 text-sm text-neutral-600">{correo}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleGuardar} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Correo
                </label>
                <input
                  type="email"
                  value={correo}
                  disabled
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-neutral-100 px-4 py-4 text-base text-[#666] outline-none"
                />
                <p className="mt-2 text-xs text-neutral-500">
                  El correo no se puede editar desde aquí por ahora.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Tu teléfono"
                />
              </div>

              {mensaje && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {mensaje}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition hover:opacity-95 disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}