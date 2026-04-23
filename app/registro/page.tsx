"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { generateVerificationToken } from "../../lib/utils/generateVerificationToken";

export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);

  const [errorRegistro, setErrorRegistro] = useState("");
  const [mensajeRegistro, setMensajeRegistro] = useState("");

  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [correoPendiente, setCorreoPendiente] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [correoRecuperacion, setCorreoRecuperacion] = useState("");
  const [recuperandoTarjeta, setRecuperandoTarjeta] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("");
  const [errorRecuperacion, setErrorRecuperacion] = useState("");

  const handleRegistro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorRegistro("");
    setMensajeRegistro("");

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    const telefonoLimpio = telefono.trim();

    if (!nombreLimpio || !correoLimpio || !telefonoLimpio) {
      setErrorRegistro("Completa todos los campos.");
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
        setErrorRegistro("No se pudo validar si el cliente ya existe.");
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
          setErrorRegistro("Ya existe un cliente registrado con ese correo y teléfono.");
          return;
        }

        if (correoDuplicado) {
          setErrorRegistro("Ya existe un cliente registrado con ese correo.");
          return;
        }

        if (telefonoDuplicado) {
          setErrorRegistro("Ya existe un cliente registrado con ese teléfono.");
          return;
        }
      }

      const public_token = crypto.randomUUID();
      const token_verificacion = generateVerificationToken();

      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            nombre,
            correo,
            telefono,
            sellos: 0,
            premios: [],
            public_token,
            email_verificado: false,
            tarjeta_activa: false,
            token_verificacion,
            token_verificacion_creado_en: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error al registrar cliente:", error);
        setErrorRegistro("Hubo un error al registrar el cliente.");
        return;
      }

      localStorage.setItem("clienteId", String(data.id));

      try {
       
        await fetch("/api/send-verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: correoLimpio,
            nombre: nombreLimpio,
            token: token_verificacion,
          }),
        });
      
      } catch (emailError) {
        console.error("Error enviando correo:", emailError);
        setMensajeRegistro(
          "Tu tarjeta fue creada, pero no pudimos enviar el correo de verificación en este momento."
        );
      }

      setRegistroExitoso(true);
      setCorreoPendiente(correoLimpio);
      setMensajeRegistro("Te enviamos un correo para activar tu tarjeta Fideli-NooK.");

      setNombre("");
      setCorreo("");
      setTelefono("");

      
    } catch (error) {
      console.error("Error inesperado en registro:", error);
      setErrorRegistro("Ocurrió un error inesperado al registrar la tarjeta.");
    } finally {
      setCargando(false);
    }
  };

  const handleReenviarCorreo = async () => {
    if (!correoPendiente || cooldown > 0) return;

    try {
      setReenviando(true);

      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: correoPendiente }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorRegistro(data.message || "No se pudo reenviar el correo.");
        return;
      }

      setErrorRegistro("");
      setMensajeRegistro("Correo reenviado. Revisa tu bandeja de entrada o spam.");
      setCooldown(60);

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error reenviando correo:", error);
      setErrorRegistro("Ocurrió un error al reenviar el correo.");
    } finally {
      setReenviando(false);
    }
  };

  const handleRecuperarTarjeta = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorRegistro("");
    setMensajeRegistro("");

    const correoLimpio = correoRecuperacion.trim().toLowerCase();

    setMensajeRecuperacion("");
    setErrorRecuperacion("");

    if (!correoLimpio) {
      setErrorRecuperacion("Ingresa tu correo.");
      return;
    }

    try {
      setRecuperandoTarjeta(true);

      const res = await fetch("/api/recover-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: correoLimpio }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorRecuperacion(
          data.error || "No se pudo recuperar la tarjeta."
        );
        return;
      }

      setMensajeRecuperacion(
        data.message ||
          "Si existe una tarjeta asociada a este correo, te enviaremos un acceso."
      );
      setCorreoRecuperacion("");
    } catch (error) {
      console.error("Error recuperando tarjeta:", error);
      setErrorRecuperacion("Ocurrió un error al recuperar la tarjeta.");
    } finally {
      setRecuperandoTarjeta(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          {/* Header violeta estilo Nook */}
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 md:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Nook
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
              Activa tu tarjeta
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Registra tu tarjeta Fideli-NooK y comienza a acumular beneficios.
            </p>
          </div>

          {/* Cuerpo */}
          <div className="px-6 py-7 md:px-8 md:py-8">
            {errorRegistro && (
              <div className="mb-5 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                {errorRegistro}
              </div>
            )}

            {mensajeRegistro && (
              <div className="mb-5 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                {mensajeRegistro}
              </div>
            )}

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

            {!registroExitoso ? (
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
                    placeholder="Ingresa tu teléfono"
                    className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cargando ? "Registrando..." : "Registrar tarjeta"}
                </button>
              </form>
            ) : (
              <div className="rounded-[24px] border border-[#E8CFE0] bg-[#F8ECF3] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7A57F6]">
                  Revisa tu correo
                </p>

                <p className="mt-3 text-sm leading-6 text-[#555]">
                  Te enviamos un correo a <span className="font-semibold">{correoPendiente}</span> para activar tu tarjeta.
                </p>

                <p className="mt-3 text-sm leading-6 text-[#555]">
                  Enviamos un enlace de verificación a <strong>{correoPendiente}</strong>.
                  Revisa tu bandeja de entrada, spam o promociones.
                </p>

                <button
                  type="button"
                  onClick={handleReenviarCorreo}
                  disabled={reenviando || cooldown > 0}
                  className="mt-4 w-full rounded-2xl border border-[#D9C8FF] bg-white px-5 py-4 text-sm font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reenviando
                    ? "Reenviando..."
                    : cooldown > 0
                    ? `Reintentar en ${cooldown}s`
                    : "Reenviar correo"}
                </button>
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-[#E8CFE0] bg-[#F8ECF3] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7A57F6]">
                ¿Ya tienes tu tarjeta Fideli-NooK?
              </p>

              <h3 className="mt-3 text-2xl font-bold text-[#4c00f7]">
                Recupera tu tarjeta
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#555]">
                Si ya registraste tu tarjeta antes, ingresa tu correo y te enviaremos un acceso directo para volver a verla.
              </p>

              {errorRecuperacion && (
                <div className="mt-4 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
                  {errorRecuperacion}
                </div>
              )}

              {mensajeRecuperacion && (
                <div className="mt-4 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
                  {mensajeRecuperacion}
                </div>
              )}

              <form onSubmit={handleRecuperarTarjeta} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#444]">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={correoRecuperacion}
                    onChange={(e) => setCorreoRecuperacion(e.target.value)}
                    placeholder="nombre@correo.com"
                    className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={recuperandoTarjeta}
                  className="mt-2 w-full rounded-2xl border border-[#D9C8FF] bg-white px-5 py-4 text-base font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recuperandoTarjeta ? "Enviando..." : "Recuperar mi tarjeta"}
                </button>
              </form>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#E8CFE0] bg-[#F8ECF3] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7A57F6]">
                ¿Cómo funciona?
              </p>

              <div className="mt-4 space-y-3 text-sm leading-6 text-[#555]">
                <p>Registra tu tarjeta con tu nombre, correo y teléfono.</p>
                <p>Recibirás un correo para activarla y acceder a tu tarjeta digital.</p>
                <p>Desde tu tarjeta podrás revisar tus premios activos y acceder luego a tu cuenta.</p>
              </div>
          </div>
        </div>
      </div>
    </main>
  );
}