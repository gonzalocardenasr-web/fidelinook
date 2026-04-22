"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerificarRegistroContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [mensaje, setMensaje] = useState("Verificando tu cuenta...");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const verificar = async () => {
      if (!token) {
        setMensaje("No encontramos un token de verificación.");
        setCargando(false);
        return;
      }

      try {
        const response = await fetch(`/api/register/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setMensaje(data.message || "No se pudo verificar tu cuenta.");
          setCargando(false);
          return;
        }

        setMensaje("Cuenta verificada correctamente. Redirigiendo al acceso...");

        setTimeout(() => {
          router.replace(`/login?verified=1&email=${encodeURIComponent(data.correo || "")}`);
        }, 2500);
      } catch (error) {
        console.error("Error verificando registro:", error);
        setMensaje("Ocurrió un error al verificar tu cuenta.");
        setCargando(false);
      }
    };

    void verificar();
  }, [token, router]);

  return (
    <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      <h1 className="text-3xl font-bold text-[#4c00f7]">
        Verificación de cuenta
      </h1>

      <p className="mt-4 text-base leading-7 text-[#555]">{mensaje}</p>

      {cargando && (
        <p className="mt-4 text-sm text-[#7A57F6]">Espera un momento...</p>
      )}
    </div>
  );
}

export default function VerificarRegistroPage() {
  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <Suspense
        fallback={
          <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <h1 className="text-3xl font-bold text-[#4c00f7]">
              Verificación de cuenta
            </h1>
            <p className="mt-4 text-base leading-7 text-[#555]">
              Cargando verificación...
            </p>
          </div>
        }
      >
        <VerificarRegistroContenido />
      </Suspense>
    </main>
  );
}