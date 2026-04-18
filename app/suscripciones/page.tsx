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

  const [procesandoAsignacion, setProcesandoAsignacion] = useState(false);
  const [procesandoCodigo, setProcesandoCodigo] = useState(false);
  const [eliminandoClaimId, setEliminandoClaimId] = useState<number | null>(null);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const [claimFilter, setClaimFilter] = useState<"all" | "pending" | "claimed">("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | "active" | "expired">("all");

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

    const { data: subscriptionsData } = await supabase
        .from("subscriptions")
        .select(`
        id,
        status,
        start_date,
        end_date,
        next_cycle_date,
        activated_at,
        created_at,
        cliente_id,
        template_id,
        clientes:cliente_id ( nombre ),
        subscription_templates:template_id ( name )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

    setClientes(clientesData || []);
    setTemplates(templatesData || []);
    setClaims(claimsData || []);
    setSubscriptions(subscriptionsData || []);
  };

  const asignarSuscripcion = async () => {
    if (!clienteId || !templateId) {
        setMensaje("Selecciona cliente y suscripción.");
        return;
    }

    try {
        setProcesandoAsignacion(true);
        setMensaje("");
        setCodigoGenerado("");

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
        await cargarDatos();
    } finally {
        setProcesandoAsignacion(false);
    }
  };

  const generarCodigo = async () => {
    if (!templateId) {
        setMensaje("Selecciona una suscripción.");
        return;
    }

    try {
        setProcesandoCodigo(true);
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
        await cargarDatos();
    } finally {
        setProcesandoCodigo(false);
    }
  };

  const eliminarClaim = async (claimId: number) => {
    const confirmado = window.confirm(
        "¿Seguro que quieres eliminar este claim pendiente?"
    );

    if (!confirmado) return;

    try {
        setEliminandoClaimId(claimId);
        setMensaje("");

        const res = await fetch("/api/subscriptions/delete-claim", {
        method: "POST",
        body: JSON.stringify({ claimId }),
        });

        const data = await res.json();

        if (!res.ok) {
        setMensaje(data.message || "No se pudo eliminar el claim.");
        return;
        }

        setMensaje("Claim eliminado correctamente.");
        await cargarDatos();
    } finally {
        setEliminandoClaimId(null);
    }
  };

  const claimsFiltrados = claims.filter((claim) => {
    if (claimFilter === "all") return true;
    return claim.status === claimFilter;
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const subscriptionsFiltradas = subscriptions.filter((subscription) => {
    if (subscriptionFilter === "all") return true;

    if (subscriptionFilter === "active") {
        return subscription.status === "active";
    }

    if (subscriptionFilter === "expired") {
        if (!subscription.end_date) return false;
        const endDate = new Date(subscription.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate < hoy;
    }

    return true;
  });

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
            disabled={procesandoAsignacion}
            className="rounded-2xl bg-black px-4 py-3 text-white transition hover:opacity-90 disabled:opacity-60"
            >
            {procesandoAsignacion ? "Asignando..." : "Asignar suscripción"}
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
            disabled={procesandoCodigo}
            className="rounded-2xl bg-violet-600 px-4 py-3 text-white transition hover:opacity-90 disabled:opacity-60"
            >
            {procesandoCodigo ? "Generando..." : "Generar código"}
          </button>

          {codigoGenerado && (
            <div className="rounded-2xl bg-neutral-100 p-4">
                <p className="mb-2 text-sm font-medium text-neutral-600">
                Código generado
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-mono text-lg text-[#111111]">
                    {codigoGenerado}
                </div>

                <button
                    onClick={() => {
                    navigator.clipboard.writeText(codigoGenerado);
                    setMensaje("Código copiado al portapapeles.");
                    }}
                    className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                    Copiar código
                </button>
                </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">
                    Claims recientes
                </h2>

                <div className="flex flex-wrap gap-2">
                    <button
                    type="button"
                    onClick={() => setClaimFilter("all")}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        claimFilter === "all"
                        ? "bg-black text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                    >
                    Todos
                    </button>

                    <button
                    type="button"
                    onClick={() => setClaimFilter("pending")}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        claimFilter === "pending"
                        ? "bg-amber-500 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                    >
                    Pendientes
                    </button>

                    <button
                    type="button"
                    onClick={() => setClaimFilter("claimed")}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        claimFilter === "claimed"
                        ? "bg-green-600 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                    >
                    Usados
                    </button>
                </div>
            </div>

            {claimsFiltrados.length === 0 ? (
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
                        <th className="px-4 py-3">Acción</th>
                    </tr>
                    </thead>

                    <tbody>
                    {claimsFiltrados.map((c) => (
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

                        <td className="px-4 py-3">
                            {c.status === "pending" ? (
                                <div className="flex flex-wrap gap-2">
                                {c.claim_code && (
                                    <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(c.claim_code);
                                        setMensaje("Código copiado al portapapeles.");
                                    }}
                                    className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                                    >
                                    Copiar código
                                    </button>
                                )}

                                <button
                                    onClick={() => eliminarClaim(c.id)}
                                    disabled={eliminandoClaimId === c.id}
                                    className="rounded-xl bg-red-500 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                                >
                                    {eliminandoClaimId === c.id ? "Eliminando..." : "Eliminar"}
                                </button>
                                </div>
                            ) : (
                                <span className="text-xs text-neutral-400">—</span>
                            )}
                        </td>

                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">
                    Suscripciones activas
                </h2>

                <div className="flex flex-wrap gap-2">
                    <button
                    type="button"
                    onClick={() => setSubscriptionFilter("all")}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        subscriptionFilter === "all"
                        ? "bg-black text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                    >
                    Todas
                    </button>

                    <button
                    type="button"
                    onClick={() => setSubscriptionFilter("active")}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        subscriptionFilter === "active"
                        ? "bg-green-600 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                    >
                    Activas
                    </button>

                    <button
                    type="button"
                    onClick={() => setSubscriptionFilter("expired")}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        subscriptionFilter === "expired"
                        ? "bg-neutral-700 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                    >
                    Vencidas
                    </button>
                </div>
            </div>

            {subscriptionsFiltradas.length === 0 ? (
                <p className="text-sm text-neutral-500">
                No hay suscripciones activas registradas aún.
                </p>
            ) : (
                <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                    <tr className="text-left text-xs uppercase text-neutral-500">
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Suscripción</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Inicio</th>
                        <th className="px-4 py-3">Vencimiento</th>
                        <th className="px-4 py-3">Próximo ciclo</th>
                        <th className="px-4 py-3">Activada</th>
                    </tr>
                    </thead>

                    <tbody>
                    {subscriptionsFiltradas.map((s) => (
                        <tr key={s.id} className="border-t text-sm">
                        <td className="px-4 py-3">
                            {s.clientes?.nombre || "-"}
                        </td>

                        <td className="px-4 py-3">
                            {s.subscription_templates?.name || "-"}
                        </td>

                        <td className="px-4 py-3">
                            <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                s.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                            >
                            {s.status === "active" ? "Activa" : s.status}
                            </span>
                        </td>

                        <td className="px-4 py-3 text-neutral-600">
                            {s.start_date
                            ? new Date(s.start_date).toLocaleDateString("es-CL")
                            : "-"}
                        </td>

                        <td className="px-4 py-3 text-neutral-600">
                            {s.end_date
                            ? new Date(s.end_date).toLocaleDateString("es-CL")
                            : "-"}
                        </td>

                        <td className="px-4 py-3 text-neutral-600">
                            {s.next_cycle_date
                            ? new Date(s.next_cycle_date).toLocaleDateString("es-CL")
                            : "-"}
                        </td>

                        <td className="px-4 py-3 text-neutral-500">
                            {s.activated_at
                            ? new Date(s.activated_at).toLocaleString("es-CL")
                            : s.created_at
                            ? new Date(s.created_at).toLocaleString("es-CL")
                            : "-"}
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