"use client";

import { useState } from "react";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
        const res = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            usuario,
            password,
        }),
        });

        const data = await res.json();

        if (!res.ok) {
        alert(data.message || "Credenciales inválidas");
        return;
        }

        window.location.href = "/";
    } catch (error) {
        console.error("Error conectando login:", error);
        alert("Ocurrió un error al intentar iniciar sesión.");
    }
    };

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 md:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Nook
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
              Acceso interno
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Ingresa con tus credenciales para acceder al panel de operación.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Usuario
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95"
              >
                Ingresar
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-[#E8CFE0] bg-[#F8ECF3] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7A57F6]">
                Acceso protegido
              </p>
              <p className="mt-3 text-sm leading-6 text-[#555]">
                Esta pantalla será usada para ingresar al home interno y al panel
                local de Fideli-NooK.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}