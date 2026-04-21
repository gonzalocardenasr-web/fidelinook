"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ClienteLogoutButton() {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);

  const cerrarSesion = async () => {
    try {
      setCerrando(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        alert("No se pudo cerrar la sesión. Intenta nuevamente.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Error cerrando sesión cliente:", error);
      alert("Ocurrió un error al cerrar sesión.");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      disabled={cerrando}
      className="cursor-pointer rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-60"
    >
      {cerrando ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}