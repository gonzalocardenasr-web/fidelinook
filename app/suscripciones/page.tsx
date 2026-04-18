"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

  const [claims, setClaims] = useState<any[]>([]);

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

    const { data: claimsData } = await supabase
        .from("subscription_claims")
        .select(`
        id,
        source,
        status,
        claim_code,
        created_at,
        assigned_cliente_id,
        template_id,
        clientes:assigned_cliente_id ( nombre ),
        subscription_templates:template_id ( name )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

    setClientes(clientesData || []);
    setTemplates(templatesData || []);
    setClaims(claimsData || []);
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

        <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
                Claims recientes
            </h2>

            {claims.length === 0 ? (
                <p className="text-sm text-neutral-500">
                No hay registros aún.
                </p>
            ) : (
                <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                    <tr className="text-left text-xs uppercase text-neutral-500">
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Suscripción</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha</th>
                    </tr>
                    </thead>

                    <tbody>
                    {claims.map((c) => (
                        <tr key={c.id} className="border-t text-sm">
                        <td className="px-4 py-3">
                            {c.source === "admin_code" ? "Código" : "Asignado"}
                        </td>

                        <td className="px-4 py-3">
                            {c.subscription_templates?.name || "-"}
                        </td>

                        <td className="px-4 py-3">
                            {c.clientes?.nombre || "-"}
                        </td>

                        <td className="px-4 py-3 font-mono">
                            {c.claim_code || "-"}
                        </td>

                        <td className="px-4 py-3">
                            <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                c.status === "claimed"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                            >
                            {c.status === "claimed" ? "Usado" : "Pendiente"}
                            </span>
                        </td>

                        <td className="px-4 py-3 text-neutral-500">
                            {new Date(c.created_at).toLocaleString("es-CL")}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
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