"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ActivarCuentaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const next = searchParams.get("next") || "/mi-cuenta";
  const correoDesdeUrl = searchParams.get("correo") || "";

  const [correo, setCorreo] = useState(correoDesdeUrl);
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const intentoAutomaticoRef = useRef(false);

  const activarCuenta = async (email: string, pass: string) => {
    const res = await fetch("/api/activar-cuenta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        correo: email,
        password: pass,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "No se pudo activar la cuenta.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (error) {
      throw new Error("La cuenta se activó, pero no se pudo iniciar sesión automáticamente.");
    }

    sessionStorage.removeItem("pendingRegisterEmail");
    sessionStorage.removeItem("pendingRegisterPassword");

    router.replace(next);
  };

  useEffect(() => {
    const emailGuardado = sessionStorage.getItem("pendingRegisterEmail") || "";
    const passwordGuardada = sessionStorage.getItem("pendingRegisterPassword") || "";

    if (!correoDesdeUrl && emailGuardado) {
      setCorreo(emailGuardado);
    }

    if (!token || intentoAutomaticoRef.current) return;
    if (!emailGuardado || !passwordGuardada) return;

    const mismoCorreo =
      !correoDesdeUrl ||
      correoDesdeUrl.trim().toLowerCase() === emailGuardado.trim().toLowerCase();

    if (!mismoCorreo) return;

    intentoAutomaticoRef.current = true;

    const ejecutar = async () => {
      try {
        setLoading(true);
        setError("");
        setMensaje("Activando tu cuenta...");

        await activarCuenta(emailGuardado, passwordGuardada);
      } catch (error) {
        console.error("No se pudo activar automáticamente:", error);
        setMensaje("");
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo activar automáticamente tu cuenta."
        );
        setCorreo(emailGuardado);
        setPassword(passwordGuardada);
        setConfirmacion(passwordGuardada);
      } finally {
        setLoading(false);
      }
    };

    void ejecutar();
  }, [token, correoDesdeUrl, next, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (!token) {
      setError("Falta el token de la tarjeta.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      setMensaje("Activando tu cuenta...");

      await activarCuenta(correo, password);
    } catch (error) {
      console.error("Error activando cuenta:", error);
      setMensaje("");
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo activar la cuenta."
      );
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
              Activa tu cuenta
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Estamos terminando la activación de tu cuenta.
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
                  Correo
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Ingresa tu correo"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Crea tu contraseña"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Repite tu contraseña"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Activando..." : "Activar cuenta"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}