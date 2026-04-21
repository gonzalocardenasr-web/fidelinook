"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        correo,
        telefono,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al registrarse");
      setLoading(false);
      return;
    }

    alert("Revisa tu correo para verificar tu cuenta");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-6 py-10">
      <div className="mx-auto max-w-md bg-white rounded-3xl p-8 shadow">
        <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border p-3 rounded-xl" />
          <input placeholder="Correo" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full border p-3 rounded-xl" />
          <input placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full border p-3 rounded-xl" />

          <button className="w-full bg-[#4c00f7] text-white p-3 rounded-xl">
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}