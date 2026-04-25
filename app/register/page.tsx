"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaMarketing, setAceptaMarketing] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setWarning("");
    setMensaje("");

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    const telefonoLimpio = telefono.trim();

    if (!nombreLimpio || !correoLimpio || !telefonoLimpio || !password || !confirmacion) {
      setError("Completa todos los campos.");
      return;
    }
    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones para crear tu cuenta.");
      return;
    }

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
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombreLimpio,
          correo: correoLimpio,
          telefono: telefonoLimpio,
          password,
          aceptaTerminos,
          aceptaMarketing,
          marketingPreferenciaDefinida: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "CLIENT_EXISTS_WITH_CARD") {
          setError(
            "Ya tienes una tarjeta Nook asociada a este correo. Para crear tu cuenta, debes acceder desde tu tarjeta."
          );
        } else {
          setError(data.error || "Error al registrarse");
        }

        setLoading(false);
        return;
      }

      if (data.code === "REGISTER_EMAIL_SEND_FAILED") {
        setWarning(
          "Tu cuenta fue creada, pero no pudimos enviar el correo de verificación. Escríbenos o vuelve a intentarlo más tarde."
        );
      }

      sessionStorage.setItem("pendingRegisterEmail", correoLimpio);
      sessionStorage.setItem("pendingRegisterPassword", password);

      if (data.code === "REGISTER_EMAIL_SEND_FAILED") {
        setLoading(false);
        return;
      }

      setMensaje("Cuenta creada correctamente. Revisa tu correo para verificar tu cuenta.");
      setPassword("");
      setConfirmacion("");

      router.push(`/verificar-registro?correo=${encodeURIComponent(correoLimpio)}`);
    } catch (error) {
      console.error("Error registrando cuenta:", error);
      setError("Ocurrió un error inesperado al crear la cuenta.");
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
              Crear cuenta
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Regístrate para acceder a tu cuenta, ver tu tarjeta y gestionar tus suscripciones.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            {error && (
              <div className="mb-5 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                <p>{error}</p>

                {error.includes("Ya tienes una tarjeta Nook asociada") && (
                  <div className="mt-3">
                    <p className="mb-2">Si ya tienes una tarjeta, debes crear tu cuenta desde ahí.</p>
                    <Link href="/registro" className="font-semibold text-[#4C00F7] underline">
                      Ir a mi tarjeta
                    </Link>
                  </div>
                )}
              </div>
            )}

            {warning && (
              <div className="mb-5 rounded-2xl border border-[#F3D9A4] bg-[#FFF7E8] px-4 py-3 text-sm text-[#6B5500]">
                <p>{warning}</p>
              </div>
            )}

            {mensaje && (
              <div className="mb-5 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                <p>{mensaje}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ingresa tu nombre"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Correo
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="nombre@correo.com"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Contraseña
                </label>

                <div className="relative">
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crea tu contraseña"
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

              <div className="space-y-3 rounded-2xl border border-[#E3D2EA] bg-[#FCF8FF] p-4 text-sm text-[#555]">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#4c00f7]"
                  />
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos" target="_blank" className="font-semibold text-[#4c00f7] underline">
                      términos y condiciones
                    </Link>{" "}
                    de Fideli-NooK.
                  </span>
                </label>

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

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear cuenta"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#555]">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-semibold text-[#4C00F7] underline">
                Inicia sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}