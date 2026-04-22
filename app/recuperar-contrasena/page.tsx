"use client";

import Link from "next/link";
import { useState } from "react";

export default function RecuperarContrasenaPage() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const correoLimpio = correo.trim().toLowerCase();
    if (!correoLimpio) {
      alert("Ingresa tu correo.");
      return;
    }

    try {
      setLoading(true);
      setMensaje("");

      const response = await fetch("/api/password/recovery", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            correo: correoLimpio,
        }),
        });

        const data = await response.json();

        if (!response.ok) {
        alert(data.message || "No se pudo enviar el correo.");
        return;
        }

        setMensaje(
        data.message ||
            "Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada o spam."
        );
      setCorreo("");

    } catch (error) {
      console.error("Error enviando recuperación:", error);
      alert("Ocurrió un error inesperado al enviar el correo.");
    } finally {
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
              Recuperar contraseña
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            {mensaje && (
              <div className="mb-5 rounded-2xl border border-[#E3D2EA] bg-[#F0EBFF] px-4 py-3 text-sm text-[#4c00f7]">
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Correo
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  placeholder="nombre@correo.com"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar correo"}
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