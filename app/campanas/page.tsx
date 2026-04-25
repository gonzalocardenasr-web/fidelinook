"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

    if (rol !== "superadmin") {
      setError("Solo el superadmin puede crear campañas.");
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
      <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[#555]">Cargando...</p>
          </div>
        </div>
      </main>
    );
  }

  if (rol !== "superadmin") {
    return (
      <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-white/80">
                Nook
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight">
                Campañas
              </h1>
              <p className="mt-2 text-sm text-white/85">
                Acceso restringido
              </p>
            </div>

            <div className="px-6 py-7 md:px-8 md:py-8">
              <div className="rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                Solo el superadmin puede acceder a esta sección.
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
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Superadmin
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight">
              Crear campaña
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Programa beneficios para activar ventas en días de menor flujo.
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Nombre interno de campaña
                </label>
                <input
                  type="text"
                  value={nombreInterno}
                  onChange={(e) => setNombreInterno(e.target.value)}
                  placeholder="Ej: Domingo topping gratis"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Nombre del premio
                </label>
                <input
                  type="text"
                  value={premioNombre}
                  onChange={(e) => setPremioNombre(e.target.value)}
                  placeholder="Ej: 1 topping gratis"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Texto visible del premio
                </label>
                <textarea
                  value={premioDescripcion}
                  onChange={(e) => setPremioDescripcion(e.target.value)}
                  placeholder="Ej: 🍫 Suma un baño de chocolate gratis con la compra de tu helado simple, doble o triple."
                  rows={4}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
                <p className="mt-2 text-xs leading-5 text-[#777]">
                  Este texto aparecerá entre “🎉 ¡Tienes un premio!” y “Muéstralo en el local para canjearlo.”
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Vigencia del premio
                </label>
                <select
                  value={duracionHoras}
                  onChange={(e) => setDuracionHoras(e.target.value)}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                >
                  <option value="24">24 horas</option>
                  <option value="48">48 horas</option>
                  <option value="72">72 horas</option>
                  <option value="168">7 días</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Fecha y hora de lanzamiento
                </label>
                <input
                  type="datetime-local"
                  value={fechaLanzamiento}
                  onChange={(e) => setFechaLanzamiento(e.target.value)}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Recurrencia
                </label>
                <select
                  value={recurrencia}
                  onChange={(e) =>
                    setRecurrencia(e.target.value === "semanal" ? "semanal" : "una_vez")
                  }
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                >
                  <option value="una_vez">Una vez</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={procesando}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {procesando ? "Procesando..." : "Crear campaña"}
              </button>

              <Link
                href="/operacion"
                className="block text-center text-sm font-semibold text-[#4c00f7] underline"
              >
                Volver a operación
              </Link>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}