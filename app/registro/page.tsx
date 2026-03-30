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
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          {/* Header violeta estilo Nook */}
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 md:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
                <Image
                  src="/Nook-logo-vertical-blnc.png"
                  alt="Nook"
                  width={56}
                  height={56}
                  priority
                  className="h-auto w-auto"
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/80">
                  Nook
                </p>
                <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                  Registro Fideli-NooK
                </h1>
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="px-6 py-7 md:px-8 md:py-8">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.28em] text-[#7A57F6]">
                Cliente
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#4c00f7]">
                Crea tu tarjeta digital
              </h2>
              <p className="mt-2 text-base leading-7 text-[#555]">
                Regístrate para comenzar a acumular sellos en tus compras
                presenciales en Nook.
              </p>
            </div>

            <form onSubmit={handleRegistro} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ingresa tu nombre"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Correo
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="nombre@correo.com"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargando ? "Registrando..." : "Crear tarjeta"}
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-[#E8CFE0] bg-[#F8ECF3] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7A57F6]">
                ¿Cómo funciona?
              </p>
              <p className="mt-3 text-sm leading-6 text-[#555]">
                Al registrarte podrás acumular sellos por tus compras
                presenciales. Cuando completes tu ciclo, obtendrás un premio
                automáticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}