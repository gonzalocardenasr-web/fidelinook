"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import ClienteLogoutButton from "../components/ClienteLogoutButton";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  auth_user_id?: string | null;
  acepta_terminos?: boolean | null;
  acepta_marketing?: boolean | null;
  fecha_aceptacion?: string | null;
  version_terminos?: string | null;
};

export default function MiPerfilPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");

  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaMarketing, setAceptaMarketing] = useState(false);
  const [terminosAceptadosOriginalmente, setTerminosAceptadosOriginalmente] = useState(false);

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
        .select("id, nombre, correo, telefono, auth_user_id, acepta_terminos, acepta_marketing, fecha_aceptacion, version_terminos")
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
      setAceptaTerminos(Boolean(cliente.acepta_terminos));
      setAceptaMarketing(Boolean(cliente.acepta_marketing));
      setTerminosAceptadosOriginalmente(Boolean(cliente.acepta_terminos));
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

    if (!terminosAceptadosOriginalmente && !aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones para continuar usando Fideli-NooK.");
      setGuardando(false);
      return;
    }

    const { error } = await supabase
      .from("clientes")
      .update({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        acepta_terminos: terminosAceptadosOriginalmente ? true : aceptaTerminos,
        acepta_marketing: aceptaMarketing,
        fecha_aceptacion: terminosAceptadosOriginalmente
          ? undefined
          : aceptaTerminos
          ? new Date().toISOString()
          : null,
        version_terminos: terminosAceptadosOriginalmente
          ? undefined
          : aceptaTerminos
          ? "v1.0"
          : null,
      })
      .eq("id", clienteId);

    if (error) {
      setError("No se pudo guardar tu perfil. Inténtalo nuevamente.");
      setGuardando(false);
      return;
    }

    if (aceptaTerminos) {
      setTerminosAceptadosOriginalmente(true);
    }

    setMensaje("Tu perfil fue actualizado correctamente.");
    setGuardando(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-neutral-600">Cargando tu perfil...</p>
        </div>
      </main>
    );
  }

  if (error && !clienteId) {
    return (
      <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-[#4C00F7]">Mi perfil</h1>
          <p className="mt-4 text-neutral-600">{error}</p>

          <button
            onClick={() => router.push("/mi-cuenta")}
            className="cursor-pointer mt-6 rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
          >
            ← Mi cuenta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/80">
                  Mi cuenta
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight">
                  Tu perfil
                </h1>
                <p className="mt-2 text-sm text-white/85">
                  Revisa y actualiza tus datos
                </p>
              </div>

              <ClienteLogoutButton />
              
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div>
              <button
                onClick={() => router.push("/mi-cuenta")}
                className="cursor-pointer rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
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

              <div className="space-y-4 rounded-2xl border border-[#E3D2EA] bg-[#FCF8FF] p-4 text-sm text-[#555]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7A57F6]">
                    Preferencias
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#555]">
                    Administra el uso de tus datos para comunicaciones, promociones y beneficios.
                  </p>
                </div>

                {!terminosAceptadosOriginalmente ? (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={aceptaTerminos}
                      onChange={(e) => setAceptaTerminos(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#4c00f7]"
                    />
                    <span>
                      Acepto los{" "}
                      <a
                        href="/terminos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#4c00f7] underline"
                      >
                        términos y condiciones
                      </a>{" "}
                      de Fideli-NooK.
                    </span>
                  </label>
                ) : (
                  <div className="rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                    Ya aceptaste los términos y condiciones vigentes.
                  </div>
                )}

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={aceptaMarketing}
                    onChange={(e) => setAceptaMarketing(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#4c00f7]"
                  />
                  <span>
                    Quiero recibir promociones, beneficios y comunicaciones de Nook.
                  </span>
                </label>
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