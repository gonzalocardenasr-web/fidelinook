"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type ActivationState = "checking" | "ready" | "invalid";

export default function ActivarAccesoPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [activationState, setActivationState] =
    useState<ActivationState>("checking");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function prepareActivationSession() {
      try {
        setError("");

        /*
         * Caso 1:
         * Supabase/PKCE puede devolver ?code=...
         */
        const currentUrl = new URL(window.location.href);
        const code = currentUrl.searchParams.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "Error exchanging activation code:",
              exchangeError,
            );

            if (mounted) {
              setActivationState("invalid");
              setError(
                "El enlace de activación no es válido o ya expiró. Solicita un nuevo enlace de acceso.",
              );
            }

            return;
          }

          /*
           * Quitamos el código de la URL después de consumirlo.
           */
          currentUrl.searchParams.delete("code");

          window.history.replaceState(
            {},
            document.title,
            currentUrl.pathname +
              currentUrl.search +
              currentUrl.hash,
          );
        }

        /*
         * Caso 2:
         * Flujo implicit/recovery tradicional:
         * #access_token=...&refresh_token=...&type=recovery
         *
         * Normalmente supabase-js procesa este hash automáticamente,
         * pero establecemos explícitamente la sesión si todavía no existe.
         */
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session && window.location.hash) {
          const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, ""),
          );

          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              console.error(
                "Error establishing activation session:",
                sessionError,
              );

              if (mounted) {
                setActivationState("invalid");
                setError(
                  "El enlace de activación no es válido o ya expiró. Solicita un nuevo enlace de acceso.",
                );
              }

              return;
            }

            session = data.session;

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname + window.location.search,
            );
          }
        }

        /*
         * Confirmación final:
         * updateUser requiere una sesión Supabase válida.
         */
        if (!session) {
          const {
            data: { session: refreshedSession },
          } = await supabase.auth.getSession();

          session = refreshedSession;
        }

        if (!session) {
          if (mounted) {
            setActivationState("invalid");
            setError(
              "No pudimos validar tu enlace de activación. Solicita un nuevo enlace de acceso.",
            );
          }

          return;
        }

        if (mounted) {
          setActivationState("ready");
        }
      } catch (unexpectedError) {
        console.error(
          "Unexpected activation session error:",
          unexpectedError,
        );

        if (mounted) {
          setActivationState("invalid");
          setError(
            "No pudimos validar tu enlace de activación. Solicita un nuevo enlace de acceso.",
          );
        }
      }
    }

    void prepareActivationSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (activationState !== "ready") {
      setError(
        "No existe una sesión válida para activar este acceso. Solicita un nuevo enlace.",
      );
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error(
          "Error updating operator password:",
          updateError,
        );

        setError(
          updateError.message ||
            "No se pudo definir la contraseña para tu acceso.",
        );

        return;
      }

      await supabase.auth.signOut();

      setMessage(
        "Tu acceso fue activado correctamente. Redirigiendo al login...",
      );

      setTimeout(() => {
        router.replace("/admin/login");
      }, 1200);
    } catch (unexpectedError) {
      console.error(
        "Error activating operator access:",
        unexpectedError,
      );

      setError(
        "Ocurrió un error inesperado al activar tu acceso.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 md:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Plataforma Nook
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
              Activa tu acceso
            </h1>

            <p className="mt-2 text-sm text-white/85">
              Define la contraseña que utilizarás para ingresar a la plataforma.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            {activationState === "checking" && (
              <div className="mb-5 rounded-2xl border border-[#DED7F7] bg-[#F6F3FF] px-4 py-3 text-sm text-[#55458A]">
                Validando tu enlace de activación...
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-5 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                {message}
              </div>
            )}

            {activationState === "ready" && !message && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#444]">
                    Contraseña
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Define tu contraseña"
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 pr-16 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#4C00F7]"
                    >
                      {showPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#444]">
                    Repetir contraseña
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showConfirmation ? "text" : "password"
                      }
                      value={confirmation}
                      onChange={(event) =>
                        setConfirmation(event.target.value)
                      }
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Repite tu contraseña"
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 pr-16 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmation((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#4C00F7]"
                    >
                      {showConfirmation ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Activando..." : "Activar acceso"}
                </button>
              </form>
            )}

            {activationState === "invalid" && (
              <div className="mt-5 text-center text-sm text-[#555]">
                Pide a un superadministrador que reenvíe tu invitación desde Gestión de Usuarios.
              </div>
            )}

            <div className="mt-6 text-center text-sm text-[#555]">
              <Link
                href="/admin/login"
                className="font-semibold text-[#4C00F7] underline"
              >
                Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}