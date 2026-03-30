"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleRegistro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    const telefonoLimpio = telefono.trim();

    if (!nombreLimpio || !correoLimpio || !telefonoLimpio) {
      alert("Completa todos los campos");
      return;
    }

    try {
      setCargando(true);

      const { data: existente, error: errorBusqueda } = await supabase
        .from("clientes")
        .select("id, nombre, correo, telefono")
        .or(`correo.eq.${correoLimpio},telefono.eq.${telefonoLimpio}`);

      if (errorBusqueda) {
        console.error("Error al validar duplicados:", errorBusqueda);
        alert("No se pudo validar si el cliente ya existe");
        return;
      }

      if (existente && existente.length > 0) {
        const correoDuplicado = existente.some(
          (cliente) => cliente.correo?.trim().toLowerCase() === correoLimpio
        );

        const telefonoDuplicado = existente.some(
          (cliente) => cliente.telefono?.trim() === telefonoLimpio
        );

        if (correoDuplicado && telefonoDuplicado) {
          alert("Ya existe un cliente registrado con ese correo y teléfono");
          return;
        }

        if (correoDuplicado) {
          alert("Ya existe un cliente registrado con ese correo");
          return;
        }

        if (telefonoDuplicado) {
          alert("Ya existe un cliente registrado con ese teléfono");
          return;
        }
      }

      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            nombre: nombreLimpio,
            correo: correoLimpio,
            telefono: telefonoLimpio,
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

      try {
        await fetch("/api/send-welcome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: correoLimpio,
            nombre: nombreLimpio,
          }),
        });
      } catch (emailError) {
        console.error("Error enviando correo:", emailError);
      }

      alert("Cliente registrado correctamente");

      setNombre("");
      setCorreo("");
      setTelefono("");

      router.push(`/t/${data.id}`);
    } catch (err) {
      console.error("Error inesperado:", err);
      alert("Ocurrió un error inesperado");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-nook-vertical.png"
            alt="Nook"
            width={180}
            height={180}
            priority
          />
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
            Registro cliente
          </span>

          <h1 className="mt-4 text-3xl font-bold text-neutral-900">
            Crea tu tarjeta Fideli-NooK
          </h1>

          <p className="mt-2 text-neutral-600">
            Regístrate y comienza a acumular sellos en cada compra.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <form onSubmit={handleRegistro} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-neutral-800">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3 outline-none focus:border-black"
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
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3 outline-none focus:border-black"
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
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3 outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="mt-4 w-full rounded-xl bg-black p-3 text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {cargando ? "Registrando..." : "Crear tarjeta"}
            </button>

          </form>

          {/* Info */}
          <div className="mt-6 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600">
            El cliente comienza a acumular sellos desde su primera compra.
          </div>

        </div>

      </div>
    </main>
  );
}