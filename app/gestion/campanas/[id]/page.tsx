"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Campana = {
  id: number;
  nombre_interno: string;
  premio_nombre: string;
  premio_descripcion: string;
  duracion_horas: number;
  fecha_lanzamiento: string;
  recurrencia: "una_vez" | "semanal";
  estado:
    | "borrador"
    | "programada"
    | "lanzando"
    | "lanzada"
    | "fallida"
    | "cancelada";
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
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [correoPrueba, setCorreoPrueba] = useState("");
  const [lanzamientoGeneralHabilitado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [nombreInterno, setNombreInterno] = useState("");
  const [premioNombre, setPremioNombre] = useState("");
  const [premioDescripcion, setPremioDescripcion] = useState("");
  const [duracionHoras, setDuracionHoras] = useState("48");
  const [fechaLanzamiento, setFechaLanzamiento] = useState("");
  const [recurrencia, setRecurrencia] = useState<"una_vez" | "semanal">(
    "una_vez",
  );

  const editable =
    campana?.estado === "borrador" ||
    campana?.estado === "programada" ||
    campana?.estado === "fallida";

  const cargarCampana = async (silenciosa = false) => {
    try {
      if (!silenciosa) setLoading(true);
      if (!silenciosa) setError("");

      const response = await fetch(`/api/operacion/campanas/${campanaId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok || !data.campana) {
        setError(data.message || "No se encontró la campaña.");
        return;
      }

      const c = data.campana as Campana;
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
          : "",
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

  const ejecutarAccion = async (
    accion: "probar" | "programar" | "ejecutar" | "cancelar",
  ) => {
    if (!campana || accionEnCurso || guardando) return;

    const correo = correoPrueba.trim().toLowerCase();

    if (accion === "probar" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError("Ingresa el correo válido de un cliente registrado para la prueba.");
      return;
    }

    const confirmacion = {
      probar: `La prueba asignará un premio real al cliente ${correo} y podrá enviarle un correo. Este cliente no recibirá un segundo premio cuando se lance la misma campaña. ¿Confirmas la prueba?`,
      programar: "Se programará esta campaña para ejecutarse en aproximadamente 5 minutos. ¿Continuar?",
      ejecutar: "ATENCIÓN: esta acción ejecutará la campaña REAL sobre sus destinatarios. Puede asignar premios y enviar correos. ¿Confirmas el lanzamiento?",
      cancelar: "Se cancelará esta campaña y no podrá lanzarse desde este estado. ¿Continuar?",
    }[accion];

    if (!window.confirm(confirmacion)) return;

    const endpoint = accion === "programar"
      ? "/api/admin/campanas/programar-lanzamiento"
      : accion === "cancelar"
        ? "/api/admin/campanas/cancelar"
        : "/api/admin/campanas/ejecutar";

    setAccionEnCurso(accion);
    setError("");
    setMensaje("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanaId: campana.id,
          ...(accion === "probar" ? { clienteCorreoPrueba: correo } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.ok === false) {
        setError(data.message || "No fue posible completar la acción.");
      } else {
        setMensaje(data.message || "Acción completada correctamente.");
      }

      await cargarCampana(true);
    } catch (err) {
      console.error("Error ejecutando acción de campaña:", err);
      setError("No se pudo completar la acción. Revisa el estado antes de reintentar.");
      await cargarCampana(true);
    } finally {
      setAccionEnCurso(null);
    }
  };

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

      const response = await fetch(`/api/operacion/campanas/${campana.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_interno: nombreInterno.trim(),
          premio_nombre: premioNombre.trim(),
          premio_descripcion: premioDescripcion.trim(),
          duracion_horas: duracion,
          fecha_lanzamiento: new Date(fechaLanzamiento).toISOString(),
          recurrencia,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || "No se pudo actualizar la campaña.");
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
      <main className="min-w-0 w-full px-3 py-3">
        <div className="mx-auto w-full max-w-7xl rounded-[28px] bg-white p-6 shadow">
          Cargando campaña...
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 w-full px-3 py-3">
      <div className="mx-auto w-full max-w-7xl">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-white px-5 py-3">
            <h1 className="mt-2 text-xl font-semibold text-neutral-950">
              Detalle de campaña
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Revisa y ajusta la configuración antes de lanzarla.
            </p>
          </div>

          <div className="px-5 py-4">
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
                <div className="mb-4 rounded-xl border border-[#E3D2EA] bg-[#FCF8FF] px-4 py-3 text-sm text-[#555]">
                  <p>
                    Estado:{" "}
                    <span className="font-semibold text-[#4c00f7]">
                      {campana.estado}
                    </span>
                  </p>
                  <p className="mt-1">
                    Alcance: {campana.total_enviados || 0}/
                    {campana.total_objetivo || 0}
                  </p>
                  {campana.error_message && (
                    <p className="mt-1 text-[#8A3550]">
                      Error: {campana.error_message}
                    </p>
                  )}
                </div>

                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
  <p className="font-semibold">
    Lanzamientos generales temporalmente suspendidos
  </p>
  <p className="mt-1">
    Puedes editar campañas, realizar pruebas con clientes registrados
    y cancelar campañas. La programación y el lanzamiento general
    permanecen suspendidos hasta completar sus controles operacionales.
  </p>
</div>
<section className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Acciones de campaña
                  </h2>

                  <p className="mt-1 text-xs text-neutral-600">
                    Las pruebas asignan premios reales. El cliente utilizado no recibirá otro premio en el lanzamiento definitivo de esta campaña.
                    Guarda primero los cambios pendientes.
                  </p>

                  {(campana.estado === "borrador") && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="flex-1 text-xs font-medium text-neutral-700">
                        Correo del cliente para prueba
                        <input
                          type="email"
                          value={correoPrueba}
                          onChange={(e) => setCorreoPrueba(e.target.value)}
                          disabled={Boolean(accionEnCurso) || guardando}
                          placeholder="cliente@ejemplo.cl"
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void ejecutarAccion("probar")}
                        disabled={Boolean(accionEnCurso) || guardando}
                        className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50"
                      >
                        {accionEnCurso === "probar"
                          ? "Procesando..."
                          : "Probar con cliente"}
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {lanzamientoGeneralHabilitado && (["borrador", "fallida"].includes(campana.estado)) && (
                      <button
                        type="button"
                        onClick={() => void ejecutarAccion("programar")}
                        disabled={Boolean(accionEnCurso) || guardando}
                        className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50"
                      >
                        Programar en 5 minutos
                      </button>
                    )}

                    {lanzamientoGeneralHabilitado && (["programada", "fallida"].includes(campana.estado)) && (
                      <button
                        type="button"
                        onClick={() => void ejecutarAccion("ejecutar")}
                        disabled={Boolean(accionEnCurso) || guardando}
                        className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {accionEnCurso === "ejecutar"
                          ? "Ejecutando..."
                          : "Ejecutar campaña real"}
                      </button>
                    )}

                    {(["borrador", "programada", "fallida"].includes(campana.estado)) && (
                      <button
                        type="button"
                        onClick={() => void ejecutarAccion("cancelar")}
                        disabled={Boolean(accionEnCurso) || guardando}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      >
                        Cancelar campaña
                      </button>
                    )}
                  </div>
                </section>
                <form onSubmit={guardarCambios} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#444]">
                      Nombre interno
                    </label>
                    <input
                      value={nombreInterno}
                      onChange={(e) => setNombreInterno(e.target.value)}
                      disabled={!editable}
                      className="w-full rounded-xl border border-[#E3D2EA] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition disabled:bg-neutral-100"
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
                      className="w-full rounded-xl border border-[#E3D2EA] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition disabled:bg-neutral-100"
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
                      rows={3}
                      className="w-full rounded-xl border border-[#E3D2EA] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition disabled:bg-neutral-100"
                    />
                  </div>

                  <div className="h-full rounded-xl border border-[#E3D2EA] bg-[#FCF8FF] p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#7A57F6]">
                      Vista previa
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-[#4c00f7]">
                      🎉 ¡Tienes un premio!
                    </h3>
                    <p className="mt-2 text-sm leading-5 text-[#555]">
                      {premioDescripcion || "Texto visible del premio..."}
                    </p>
                    <p className="mt-2 text-sm text-[#555]">
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
                      className="w-full rounded-xl border border-[#E3D2EA] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition disabled:bg-neutral-100"
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
                      className="w-full rounded-xl border border-[#E3D2EA] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition disabled:bg-neutral-100"
                    />
                  </div>

                  <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:justify-end">
                    {editable && (
                      <button
                        type="submit"
                        disabled={guardando || Boolean(accionEnCurso)}
                        className="w-full rounded-xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-3 text-sm font-semibold sm:w-auto text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:opacity-60"
                      >
                        {guardando ? "Guardando..." : "Guardar cambios"}
                      </button>
                    )}

                    <Link
                      href="/campanas"
                      className="w-full rounded-xl border border-[#D9C8FF] bg-white px-5 py-3 text-center text-sm font-semibold sm:w-auto text-[#4c00f7] transition hover:bg-[#F7F2FF]"
                    >
                      Volver a Campañas
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
