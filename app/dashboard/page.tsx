"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AdminStats from "../operacion/components/AdminStats";

type Premio = {
  id: number;
  nombre: string;
  estado: "activo" | "usado";
  vencimiento?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  sellos: number;
  premios: Premio[] | number | null;
  public_token: string;
  tarjeta_activa?: boolean;
  email_verificado?: boolean;
};

export default function DashboardPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setCargando(true);
      setMensaje("");

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error cargando clientes para dashboard:", error);
        setMensaje("No se pudieron cargar los indicadores.");
        setClientes([]);
        return;
      }

      setClientes((data || []) as Cliente[]);
    } catch (error) {
      console.error("Error inesperado cargando dashboard:", error);
      setMensaje("Ocurrió un error inesperado al cargar el dashboard.");
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-[#454545] transition hover:opacity-70"
          >
            ← Volver al inicio
          </Link>

          <span className="mt-5 inline-flex rounded-full bg-[#E1B4D0] px-3 py-1 text-sm font-medium text-[#454545]">
            Dashboard
          </span>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#111111]">
            Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-[#454545]">
            Indicadores actuales del programa de fidelización.
          </p>
        </div>

        {cargando ? (
          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-base leading-7 text-[#454545]">
              Cargando indicadores...
            </p>
          </section>
        ) : mensaje ? (
          <section className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
            <p className="text-base leading-7 text-red-600">{mensaje}</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
            <AdminStats clientes={clientes} />
          </section>
        )}
      </div>
    </main>
  );
}