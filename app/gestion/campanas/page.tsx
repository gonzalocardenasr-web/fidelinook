"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CampanasListado from "@/app/campanas/components/CampanasListado";

export default function CampanasPage() {
  const [rol, setRol] = useState<string | null>(null);
  const [cargandoRol, setCargandoRol] = useState(true);

  const [nombreInterno, setNombreInterno] = useState("");
  const [premioNombre, setPremioNombre] = useState("");
  const [premioDescripcion, setPremioDescripcion] = useState("");
  const [duracionHoras, setDuracionHoras] = useState("48");
  const [fechaLanzamiento, setFechaLanzamiento] = useState("");
  const [recurrencia, setRecurrencia] = useState<"una_vez" | "semanal">("una_vez");

  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const res = await fetch("/api/session");

        if (!res.ok) {
          setRol(null);
          return;
        }

        const data = await res.json();
        setRol(data.role || null);
      } catch (error) {
        console.error("Error cargando sesión:", error);
        setRol(null);
      } finally {
        setCargandoRol(false);
      }
    };

    void cargarSesion();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMensaje("");
    setError("");

    if (rol !== "admin" && rol !== "superadmin") {
      setError("No tienes permisos para crear campañas.");
      return;
    }

    if (!nombreInterno.trim()) {
      setError("Ingresa un nombre interno para la campaña.");
      return;
    }

    if (!premioNombre.trim()) {
      setError("Ingresa el nombre del premio.");
      return;
    }

    if (!premioDescripcion.trim()) {
      setError("Ingresa el texto visible del premio.");
      return;
    }

    if (!fechaLanzamiento) {
      setError("Selecciona fecha y hora de lanzamiento.");
      return;
    }

    try {
      setProcesando(true);

      const res = await fetch("/api/admin/campanas/lanzar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombreInterno: nombreInterno.trim(),
          premioNombre: premioNombre.trim(),
          premioDescripcion: premioDescripcion.trim(),
          duracionHoras: Number(duracionHoras),
          fechaLanzamiento: new Date(fechaLanzamiento).toISOString(),
          recurrencia,
          creadoPor: "superadmin",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "No se pudo crear la campaña.");
        return;
      }

      setMensaje(data.message || "Campaña creada correctamente.");

      setNombreInterno("");
      setPremioNombre("");
      setPremioDescripcion("");
      setDuracionHoras("48");
      setFechaLanzamiento("");
      setRecurrencia("una_vez");
    } catch (error) {
      console.error("Error creando campaña:", error);
      setError("Ocurrió un error inesperado al crear la campaña.");
    } finally {
      setProcesando(false);
    }
  };

  if (cargandoRol) {
    return (
      <main className="min-w-0 w-full px-3 py-3">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[#555]">Cargando...</p>
          </div>
        </div>
      </main>
    );
  }

  if (rol !== "admin" && rol !== "superadmin") {
    return (
      <main className="min-w-0 w-full px-3 py-3">
        <div className="mx-auto w-full max-w-7xl">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-white px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Nook
              </p>
              <h1 className="mt-2 text-xl font-semibold text-neutral-950">
                Campañas
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                Acceso restringido
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                No tienes permisos para acceder a esta sección.
              </div>

              <Link
                href="/operacion"
                className="mt-6 inline-flex rounded-2xl border border-[#D9C8FF] bg-white px-5 py-3 font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF]"
              >
                ← Volver a operación
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 w-full px-3 py-3">
      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <div className="min-w-0"><CampanasListado /></div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-white px-4 py-3">
            <h1 className="text-base font-semibold text-neutral-950">
              Crear campaña
            </h1>
            <p className="text-[11px] text-neutral-500">
              Programa beneficios para activar ventas en días de menor flujo.
            </p>
          </div>

          <div className="px-4 py-3">
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

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Nombre interno de campaña
                </label>
                <input
                  type="text"
                  value={nombreInterno}
                  onChange={(e) => setNombreInterno(e.target.value)}
                  placeholder="Ej: Domingo topping gratis"
                  className="w-full rounded-lg border border-[#E3D2EA] bg-white px-3 py-2 text-xs text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Nombre del premio
                </label>
                <input
                  type="text"
                  value={premioNombre}
                  onChange={(e) => setPremioNombre(e.target.value)}
                  placeholder="Ej: 1 topping gratis"
                  className="w-full rounded-lg border border-[#E3D2EA] bg-white px-3 py-2 text-xs text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Texto visible del premio
                </label>
                <textarea
                  value={premioDescripcion}
                  onChange={(e) => setPremioDescripcion(e.target.value)}
                  placeholder="Ej: 🍫 Suma un baño de chocolate gratis con la compra de tu helado simple, doble o triple."
                  rows={2}
                  className="w-full rounded-lg border border-[#E3D2EA] bg-white px-3 py-2 text-xs text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
                <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                  Este texto aparecerá entre “🎉 ¡Tienes un premio!” y “Muéstralo en el local para canjearlo.”
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Vigencia del premio
                </label>
                <select
                  value={duracionHoras}
                  onChange={(e) => setDuracionHoras(e.target.value)}
                  className="w-full rounded-lg border border-[#E3D2EA] bg-white px-3 py-2 text-xs text-[#222] outline-none transition focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                >
                  <option value="24">24 horas</option>
                  <option value="48">48 horas</option>
                  <option value="72">72 horas</option>
                  <option value="168">7 días</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Fecha y hora de lanzamiento
                </label>
                <input
                  type="datetime-local"
                  value={fechaLanzamiento}
                  onChange={(e) => setFechaLanzamiento(e.target.value)}
                  className="w-full rounded-lg border border-[#E3D2EA] bg-white px-3 py-2 text-xs text-[#222] outline-none transition focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Recurrencia
                </label>
                <select
                  value={recurrencia}
                  onChange={(e) =>
                    setRecurrencia(e.target.value === "semanal" ? "semanal" : "una_vez")
                  }
                  className="w-full rounded-lg border border-[#E3D2EA] bg-white px-3 py-2 text-xs text-[#222] outline-none transition focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                >
                  <option value="una_vez">Una vez</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={procesando}
                className="lg:col-span-2 mt-1 w-full rounded-lg bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {procesando ? "Procesando..." : "Crear campaña"}
              </button>

            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
