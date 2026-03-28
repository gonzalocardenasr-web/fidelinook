"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleRegistro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!nombre || !correo || !telefono) {
      alert("Completa todos los campos");
      return;
    }

    try {
      setCargando(true);

      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            nombre,
            correo,
            telefono,
            sellos: 0,
            premios: [],
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error al registrar cliente:", error);
        alert("Hubo un error al registrar el cliente");
        return;
      }

      localStorage.setItem("clienteId", String(data.id));

      alert("Cliente registrado correctamente");

      setNombre("");
      setCorreo("");
      setTelefono("");

      router.push("/tarjeta");
    } catch (err) {
      console.error("Error inesperado:", err);
      alert("Ocurrió un error inesperado");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto mt-16 max-w-xl rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-neutral-900">
          Registro Fideli-NooK
        </h1>

        <form onSubmit={handleRegistro} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 p-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Correo
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 p-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 p-3 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-black p-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? "Registrando..." : "Crear tarjeta"}
          </button>
        </form>
      </div>
    </main>
  );
}