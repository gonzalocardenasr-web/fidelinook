import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { supabase } from "../../../lib/supabase";

type Premio = {
  id: number | string;
  nombre: string;
  descripcion?: string;
  estado: "activo" | "usado" | "caducado";
  vencimiento?: string;
  tipo?: string;
  campana_id?: number;
  fecha_canje?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  sellos: number;
  premios: Premio[] | null;
  public_token: string;
  tarjeta_activa?: boolean;
  email_verificado?: boolean;
  auth_user_id?: string | null;
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const META_SELLOS = 7;

function formatearFecha(fecha?: string) {
  if (!fecha) return "Sin definir";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return "Sin definir";

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function estaVencido(fecha?: string) {
  if (!fecha) return false;

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}

export default async function TarjetaPublicaPage({ params }: Props) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("public_token", id)
    .single();

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">Tarjeta Nook</h1>
          <p className="mt-4 text-neutral-600">No se encontró esta tarjeta.</p>
        </div>
      </main>
    );
  }

  const clienteTyped = data as Cliente;

  if (!clienteTyped.tarjeta_activa) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">
            Tarjeta pendiente de activación
          </h1>

          <p className="mt-4 text-neutral-600">
            Debes verificar tu correo electrónico para activar tu tarjeta
            Fideli-NooK.
          </p>

          <p className="mt-2 text-neutral-500 text-sm">
            Revisa tu bandeja de entrada y haz clic en el enlace de verificación.
          </p>
        </div>
      </main>
    );
  }

  const premiosArray = Array.isArray(clienteTyped.premios)
    ? clienteTyped.premios
    : [];

  const premiosActivos = premiosArray.filter(
    (premio: Premio) =>
      premio.estado === "activo" && !estaVencido(premio.vencimiento)
  );

  const premiosUsados = premiosArray.filter(
    (premio: Premio) => premio.estado === "usado"
  );

  const premiosCaducados = premiosArray.filter(
    (premio: Premio) =>
      premio.estado === "caducado" ||
      (premio.estado === "activo" && estaVencido(premio.vencimiento))
  );

  const premioDestacado =
  premiosActivos.find(
    (premio: Premio) =>
      premio.tipo === "campana" || premio.tipo === "campana_prueba"
  ) ||
  premiosActivos[0] ||
  null;

  const sellos = clienteTyped.sellos ?? 0;
  const urlTarjeta = `https://fidelidad.nookheladeria.cl/t/${clienteTyped.public_token}`;

  const perfilHref = clienteTyped.auth_user_id
    ? `/login?next=${encodeURIComponent("/mi-cuenta")}`
    : `/activar-cuenta?token=${encodeURIComponent(
        clienteTyped.public_token
      )}&next=${encodeURIComponent("/mi-cuenta")}`;

  const suscripcionesHref = clienteTyped.auth_user_id
    ? `/login?next=${encodeURIComponent("/mi-cuenta/suscripciones")}`
    : `/activar-cuenta?token=${encodeURIComponent(
        clienteTyped.public_token
      )}&next=${encodeURIComponent("/mi-cuenta/suscripciones")}`;

  return (
    <main className="min-h-screen bg-[#FFDBEF] p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-[#4C00F7] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10">
                <Image
                  src="/Nook-logo-vertical-blnc.png"
                  alt="Nook Heladería de Autora"
                  width={56}
                  height={56}
                  className="h-auto w-auto"
                  priority
                />
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
                  Nook
                </p>
                <h1 className="text-3xl font-bold">Tarjeta Nook</h1>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
                                   
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Cliente
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#4C00F7]">
                {clienteTyped.nombre}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                {clienteTyped.correo}
              </p>
              <p className="text-sm text-neutral-600">
                {clienteTyped.telefono}
              </p>
            </div>

            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={perfilHref}
                  className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] px-4 py-3 text-center text-sm font-semibold text-[#4C00F7] transition hover:opacity-95"
                >
                  Administrar mi perfil
                </Link>

                <Link
                  href={suscripcionesHref}
                  className="rounded-2xl bg-[#4C00F7] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Ver mis suscripciones
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#4C00F7]/15 bg-[#FFDBEF]/40 p-5">
              <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#4C00F7]">
                Tu código de cliente
              </p>

              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-sm">
                <QRCode value={urlTarjeta} size={180} />
              </div>

              <p className="mt-4 text-center text-xs text-neutral-500">
                Muéstralo en caja para identificar tu tarjeta
              </p>
            </div>

            <div className="rounded-2xl border border-[#4C00F7]/15 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    Progreso actual
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#4C00F7]">
                    {sellos} de {META_SELLOS} sellos
                  </p>
                </div>

                <div className="rounded-full bg-[#4C00F7] px-4 py-2 text-sm font-semibold text-white">
                  {META_SELLOS - sellos} para tu premio
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2">
                {[...Array(META_SELLOS)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${
                      i < sellos
                        ? "border-[#4C00F7] bg-[#4C00F7] text-white"
                        : "border-[#4C00F7]/25 bg-[#FFDBEF] text-[#4C00F7]"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {premioDestacado && (
              <div className="rounded-2xl border border-[#4C00F7]/15 bg-[#4C00F7] p-5 text-white">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/80">
                  Premio disponible
                </p>
                <p className="mt-2 text-2xl font-bold">🎉 ¡Tienes un premio!</p>

                <p className="mt-2 text-lg leading-7">
                  {premioDestacado.descripcion || premioDestacado.nombre}
                </p>

                {premioDestacado.vencimiento && (
                  <p className="mt-2 text-sm text-white/80">
                    Vence: {formatearFecha(premioDestacado.vencimiento)}
                  </p>
                )}

                <p className="mt-2 text-sm text-white/80">
                  Muéstralo en el local para canjearlo.
                </p>
              </div>
            )}
                      
          </div>
        </div>

        <details className="group overflow-hidden rounded-[24px] bg-white shadow">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-xl font-bold text-[#4C00F7]">
            <span>Premios activos ({premiosActivos.length})</span>
            <span className="text-2xl leading-none group-open:hidden">+</span>
            <span className="hidden text-2xl leading-none group-open:inline">−</span>
          </summary>

          <div className="border-t border-neutral-200 px-6 py-5">
            {premiosActivos.length === 0 ? (
              <p className="text-neutral-600">No tienes premios activos.</p>
            ) : (
              <div className="space-y-3">
                {premiosActivos.map((premio: Premio) => (
                  <div
                    key={premio.id}
                    className="rounded-2xl border border-[#4C00F7]/15 bg-[#FFDBEF]/35 p-4"
                  >
                    <p className="font-semibold text-[#4C00F7]">
                      {premio.nombre}
                    </p>                    

                    <p className="mt-2 text-sm text-neutral-600">
                      Estado: activo
                    </p>
                    <p className="text-sm text-neutral-600">
                      Vence: {formatearFecha(premio.vencimiento)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
        
        <details className="group overflow-hidden rounded-[24px] bg-white shadow">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-xl font-bold text-[#4C00F7]">
            <span>Historial de premios usados ({premiosUsados.length})</span>
            <span className="text-2xl leading-none group-open:hidden">+</span>
            <span className="hidden text-2xl leading-none group-open:inline">−</span>
          </summary>

          <div className="border-t border-neutral-200 px-6 py-5">
            {premiosUsados.length === 0 ? (
              <p className="text-neutral-600">
                Todavía no has canjeado premios.
              </p>
            ) : (
              <div className="space-y-3">
                {premiosUsados.map((premio: Premio) => (
                  <div
                    key={premio.id}
                    className="rounded-2xl border border-neutral-200 p-4"
                  >
                    <p className="font-semibold text-[#4C00F7]">
                      {premio.nombre}
                    </p>                    

                    <p className="mt-2 text-sm text-neutral-600">
                      Estado: usado
                    </p>
                    <p className="text-sm text-neutral-600">
                      Vencía: {formatearFecha(premio.vencimiento)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="group overflow-hidden rounded-[24px] bg-white shadow">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-xl font-bold text-[#4C00F7]">
            <span>Historial de premios caducados ({premiosCaducados.length})</span>
            <span className="text-2xl leading-none group-open:hidden">+</span>
            <span className="hidden text-2xl leading-none group-open:inline">−</span>
          </summary>

          <div className="border-t border-neutral-200 px-6 py-5">
            {premiosCaducados.length === 0 ? (
              <p className="text-neutral-600">
                No tienes premios caducados.
              </p>
            ) : (
              <div className="space-y-3">
                {premiosCaducados.map((premio: Premio) => (
                  <div
                    key={premio.id}
                    className="rounded-2xl border border-neutral-200 p-4"
                  >
                    <p className="font-semibold text-[#4C00F7]">
                      {premio.nombre}
                    </p>                    

                    <p className="mt-2 text-sm text-neutral-600">
                      Estado: caducado
                    </p>
                    <p className="text-sm text-neutral-600">
                      Venció: {formatearFecha(premio.vencimiento)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
        
      </div>
    </main>
  );
}