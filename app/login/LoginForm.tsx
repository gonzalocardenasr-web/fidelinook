"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/mi-cuenta";

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const verified = searchParams.get("verified");
      const emailParam = searchParams.get("email");

      if (verified === "1") {
        setMensaje("Cuenta verificada correctamente. Ahora ingresa con tu correo y contraseña.");
      }

      if (emailParam) {
        setCorreo(emailParam);
    }
    
    
    
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace(next);
      }
    };

    checkSession();
  }, [router, next]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password,
    });

    if (error) {
      alert("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }

    router.replace(next);
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
              Accede a tu cuenta
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Ingresa con tu correo y contraseña para administrar tu cuenta.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            {mensaje && (
              <div className="mb-5 rounded-2xl border border-[#E3D2EA] bg-[#F8ECF3] px-4 py-3 text-sm text-[#555]">
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
                  className="w-full rounded-2xl border border-[#E3D2EA] px-4 py-4"
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
                  className="w-full rounded-2xl border border-[#E3D2EA] px-4 py-4"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#4c00f7] text-white py-4"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              <div className="mt-4 text-sm text-center space-y-2">
                <button
                  type="button"
                  onClick={() => alert("Flujo recuperar contraseña próximamente")}
                  className="text-[#4c00f7] underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>

                <p>
                  ¿No tienes cuenta?{" "}
                  <span
                    onClick={() => router.push("/register")}
                    className="text-[#4c00f7] font-semibold cursor-pointer"
                  >
                    Crear cuenta
                  </span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}