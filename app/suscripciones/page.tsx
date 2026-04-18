"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
};

type Template = {
  id: number;
  name: string;
};

export default function SuscripcionesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [codigoGenerado, setCodigoGenerado] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, correo")
      .order("nombre");

    const { data: templatesData } = await supabase
      .from("subscription_templates")
      .select("id, name")
      .eq("is_active", true);

    setClientes(clientesData || []);
    setTemplates(templatesData || []);
  };

  const asignarSuscripcion = async () => {
    if (!clienteId || !templateId) {
      setMensaje("Selecciona cliente y suscripción.");
      return;
    }

    setMensaje("");

    const res = await fetch("/api/subscriptions/create-assigned", {
      method: "POST",
      body: JSON.stringify({
        clienteId: Number(clienteId),
        templateId: Number(templateId),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.message || "Error asignando suscripción.");
      return;
    }

    setMensaje("Suscripción asignada correctamente.");
  };

  const generarCodigo = async () => {
    if (!templateId) {
      setMensaje("Selecciona una suscripción.");
      return;
    }

    setMensaje("");

    const res = await fetch("/api/subscriptions/create-code", {
      method: "POST",
      body: JSON.stringify({
        templateId: Number(templateId),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.message || "Error generando código.");
      return;
    }

    setCodigoGenerado(data.code);
    setMensaje("Código generado correctamente.");
  };

  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link href="/" className="text-sm text-[#454545]">
            ← Volver al inicio
          </Link>

          <h1 className="mt-4 text-4xl font-bold">Suscripciones</h1>
        </div>

        {/* ASIGNACIÓN */}
        <section className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">
            Asignar suscripción a cliente
          </h2>

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="">Selecciona cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.correo})
              </option>
            ))}
          </select>

          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="">Selecciona suscripción</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={asignarSuscripcion}
            className="bg-black text-white px-4 py-3 rounded"
          >
            Asignar suscripción
          </button>
        </section>

        {/* GENERAR CÓDIGO */}
        <section className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Generar código</h2>

          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="">Selecciona suscripción</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={generarCodigo}
            className="bg-violet-600 text-white px-4 py-3 rounded"
          >
            Generar código
          </button>

          {codigoGenerado && (
            <div className="bg-neutral-100 p-4 rounded text-center font-mono text-lg">
              {codigoGenerado}
            </div>
          )}
        </section>

        {mensaje && (
          <div className="bg-neutral-200 p-4 rounded text-sm">
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}