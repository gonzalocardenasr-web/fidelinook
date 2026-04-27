"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Campana = {
  id: number;
  nombre_interno: string;
  premio_nombre: string;
  premio_descripcion: string;
  duracion_horas: number;
  fecha_lanzamiento: string;
  recurrencia: "una_vez" | "semanal";
  estado: "borrador" | "programada" | "lanzando" | "lanzada" | "fallida" | "cancelada";
  total_objetivo?: number | null;
  total_enviados?: number | null;
  error_message?: string | null;
  created_at?: string | null;
  launched_at?: string | null;
};

export default function CampanaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const campanaId = Number(params.id);

  const [campana, setCampana] = useState<Campana | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [nombreInterno, setNombreInterno] = useState("");
  const [premioNombre, setPremioNombre] = useState("");
  const [premioDescripcion, setPremioDescripcion] = useState("");
  const [duracionHoras, setDuracionHoras] = useState("48");
  const [fechaLanzamiento, setFechaLanzamiento] = useState("");
  const [recurrencia, setRecurrencia] = useState<"una_vez" | "semanal">("una_vez");

  const editable =
    campana?.estado === "borrador" ||
    campana?.estado === "programada" ||
    campana?.estado === "fallida";

  const cargarCampana = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("campanas")
        .select("*")
        .eq("id", campanaId)
        .single();

      if (error || !data) {
        setError("No se encontró la campaña.");
        return;
      }

      const c = data as Campana;
      setCampana(c);
      setNombreInterno(c.nombre_interno || "");
      setPremioNombre(c.premio_nombre || "");
      setPremioDescripcion(c.premio_descripcion || "");
      setDuracionHoras(String(c.duracion_horas || 48));
      setFechaLanzamiento(
        c.fecha_lanzamiento
            ? new Date(c.fecha_lanzamiento)
                .toLocaleString("sv-SE", {
                timeZone: "America/Santiago",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                })
                .replace(" ", "T")
            : ""
      );
      setRecurrencia(c.recurrencia || "una_vez");
    } catch (error) {
      console.error("Error cargando campaña:", error);
      setError("Ocurrió un error al cargar la campaña.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(campanaId)) return;
    void cargarCampana();
  }, [campanaId]);

  const guardarCambios = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!campana || !editable) return;

    setMensaje("");
    setError("");

    if (!nombreInterno.trim()) {
      setError("Ingresa un nombre interno.");
      return;
    }

    if (!premioNombre.trim()) {
      setError("Ingresa el nombre del premio.");
      return;
    }

    if (!premioDescripcion.trim()) {
      setError("Ingresa la descripción visible del premio.");
      return;
    }

    const duracion = Number(duracionHoras);

    if (!Number.isFinite(duracion) || duracion < 24 || duracion % 24 !== 0) {
      setError("La vigencia debe ser un múltiplo de 24 horas.");
      return;
    }

    try {
      setGuardando(true);

      const { error } = await supabase
        .from("campanas")
        .update({
          nombre_interno: nombreInterno.trim(),
          premio_nombre: premioNombre.trim(),
          premio_descripcion: premioDescripcion.trim(),
          duracion_horas: duracion,
          fecha_lanzamiento: new Date(fechaLanzamiento).toISOString(),
          recurrencia,
        })
        .eq("id", campana.id);

      if (error) {
        setError("No se pudo actualizar la campaña.");
        return;
      }

      setMensaje("Campaña actualizada correctamente.");
      await cargarCampana();
    } catch (error) {
      console.error("Error guardando campaña:", error);
      setError("Ocurrió un error al guardar la campaña.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-6 shadow">
          Cargando campaña...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Superadmin
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight">
              Detalle de campaña
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Revisa y ajusta la configuración antes de lanzarla.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            {error && (
              <div className="mb-5 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="mb-5 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                {mensaje}
              </div>
            )}

            {campana && (
              <>
                <div className="mb-5 rounded-2xl border border-[#E3D2EA] bg-[#FCF8FF] p-4 text-sm text-[#555]">
                  <p>
                    Estado: <span className="font-semibold text-[#4c00f7]">{campana.estado}</span>
                  </p>
                  <p className="mt-1">
                    Alcance: {campana.total_enviados || 0}/{campana.total_objetivo || 0}
                  </p>
                  {campana.error_message && (
                    <p className="mt-1 text-[#8A3550]">
                      Error: {campana.error_message}
                    </p>
                  )}
                </div>

                <form onSubmit={guardarCambios} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#444]">
                      Nombre interno
                    </label>
                    <input
                      value={nombreInterno}
                      onChange={(e) => setNombreInterno(e.target.value)}
                      disabled={!editable}
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition disabled:bg-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#444]">
                      Nombre del premio
                    </label>
                    <input
                      value={premioNombre}
                      onChange={(e) => setPremioNombre(e.target.value)}
                      disabled={!editable}
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition disabled:bg-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#444]">
                      Texto visible del premio
                    </label>
                    <textarea
                      value={premioDescripcion}
                      onChange={(e) => setPremioDescripcion(e.target.value)}
                      disabled={!editable}
                      rows={4}
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition disabled:bg-neutral-100"
                    />
                  </div>

                  <div className="rounded-2xl border border-[#E3D2EA] bg-[#FCF8FF] p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#7A57F6]">
                      Vista previa
                    </p>
                    <h3 className="mt-3 text-xl font-bold text-[#4c00f7]">
                      🎉 ¡Tienes un premio!
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#555]">
                      {premioDescripcion || "Texto visible del premio..."}
                    </p>
                    <p className="mt-3 text-sm text-[#555]">
                      Muéstralo en el local para canjearlo.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#444]">
                      Vigencia
                    </label>
                    <select
                      value={duracionHoras}
                      onChange={(e) => setDuracionHoras(e.target.value)}
                      disabled={!editable}
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition disabled:bg-neutral-100"
                    >
                      <option value="24">24 horas</option>
                      <option value="48">48 horas</option>
                      <option value="72">72 horas</option>
                      <option value="168">7 días</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#444]">
                      Fecha y hora referencial
                    </label>
                    <input
                      type="datetime-local"
                      value={fechaLanzamiento}
                      onChange={(e) => setFechaLanzamiento(e.target.value)}
                      disabled={!editable}
                      className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition disabled:bg-neutral-100"
                    />
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    {editable && (
                      <button
                        type="submit"
                        disabled={guardando}
                        className="w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:opacity-60"
                      >
                        {guardando ? "Guardando..." : "Guardar cambios"}
                      </button>
                    )}

                    <Link
                      href="/operacion"
                      className="w-full rounded-2xl border border-[#D9C8FF] bg-white px-5 py-4 text-center text-base font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF]"
                    >
                      Volver a operación
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}