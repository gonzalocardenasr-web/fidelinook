"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RestablecerContrasenaPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setMensaje("");
    setLoading(true);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message || "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }

      setMensaje("Tu contraseña fue actualizada correctamente. Redirigiendo al login...");
      setLoading(false);

      setTimeout(() => {
        router.replace("/login");
      }, 1500);

    } catch (error) {
      console.error("Error actualizando contraseña:", error);
      setError("Ocurrió un error inesperado al actualizar la contraseña.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 md:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Nook
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
              Restablecer contraseña
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Define una nueva contraseña para tu cuenta.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            {error && (
              <div className="mb-5 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="mb-5 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Nueva contraseña
                </label>

                <div className="relative">
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Nueva contraseña"
                    className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 pr-16 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#4C00F7]"
                  >
                    {mostrarPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Repetir contraseña
                </label>

                <div className="relative">
                  <input
                    type={mostrarConfirmacion ? "text" : "password"}
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repite tu contraseña"
                    className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 pr-16 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#4C00F7]"
                  >
                    {mostrarConfirmacion ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#555]">
              <Link href="/login" className="font-semibold text-[#4C00F7] underline">
                Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}