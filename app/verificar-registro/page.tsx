"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerificarRegistro() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");

    if (!token) return;

    fetch(`/api/register/verify?token=${token}`)
      .then(() => {
        router.push("/mi-cuenta");
      })
      .catch(() => {
        alert("Error verificando cuenta");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Verificando cuenta...
    </div>
  );
}