"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  premios: Premio[] | null;
};

export default function TarjetaPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const cargarCliente = async (esActualizacionManual = false) => {
    try {
      if (esActualizacionManual) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const clienteId = localStorage.getItem("clienteId");

      if (!clienteId) {
        setCliente(null);
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single();

      if (error) {
        console.error("Error al cargar cliente:", error);
        return;
      }

      setCliente(data as Cliente);
    } catch (err) {
      console.error("Error inesperado al cargar cliente:", err);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarCliente();
  }, []);

  if (cargando) {
    return (
      <main className="min-h-screen bg-neutral-100 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-neutral-900">Mi tarjeta</h1>
          <p className="mt-4 text-neutral-600">Cargando tarjeta...</p>
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen bg-neutral-100 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-neutral-900">Mi tarjeta</h1>
          <p className="mt-4 text-neutral-600">
            No se encontró un cliente registrado.
          </p>
        </div>
      </main>
    );
  }

  const premiosArray = Array.isArray(cliente.premios) ? cliente.premios : [];

  const premiosActivos = premiosArray.filter(
    (premio: Premio) => premio.estado === "activo"
  );

  const premiosUsados = premiosArray.filter(
    (premio: Premio) => premio.estado === "usado"
  );

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">
              Tarjeta Fideli-NooK
            </h1>

            <button
              onClick={() => cargarCliente(true)}
              disabled={actualizando}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {actualizando ? "Actualizando..." : "Actualizar tarjeta"}
            </button>
          </div>

          <div className="mt-4">
            <p className="text-lg font-semibold">{cliente.nombre}</p>
            <p className="text-sm text-neutral-500">{cliente.correo}</p>
            <p className="text-sm text-neutral-500">{cliente.telefono}</p>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium">Progreso actual</p>

            <div className="mt-2 flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    i < (cliente.sellos ?? 0)
                      ? "bg-black text-white"
                      : "bg-white text-neutral-700"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-neutral-600">
              {cliente.sellos ?? 0} de 6 sellos
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-neutral-900">
            Premios activos
          </h2>

          {premiosActivos.length === 0 ? (
            <p className="mt-4 text-neutral-600">No tienes premios activos.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {premiosActivos.map((premio: Premio) => (
                <div
                  key={premio.id}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <p className="font-semibold">{premio.nombre}</p>
                  <p className="text-sm text-neutral-600">
                    Estado: {premio.estado}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Vence: {premio.vencimiento || "Sin definir"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-neutral-900">
            Historial de premios usados
          </h2>

          {premiosUsados.length === 0 ? (
            <p className="mt-4 text-neutral-600">
              Todavía no has canjeado premios.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {premiosUsados.map((premio: Premio) => (
                <div
                  key={premio.id}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <p className="font-semibold">{premio.nombre}</p>
                  <p className="text-sm text-neutral-600">
                    Estado: {premio.estado}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Vencía: {premio.vencimiento || "Sin definir"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}