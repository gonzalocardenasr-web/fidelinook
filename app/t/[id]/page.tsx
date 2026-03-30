import Image from "next/image";
import QRCode from "react-qr-code";
import { supabase } from "../../../lib/supabase";

type Premio = {
  id: number;
  nombre: string;
  estado: "activo" | "usado";
  vencimiento?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  sellos: number;
  premios: Premio[] | null;
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TarjetaPublicaPage({ params }: Props) {
  const { id } = await params;

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !cliente) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">Tarjeta Nook</h1>
          <p className="mt-4 text-neutral-600">No se encontró esta tarjeta.</p>
        </div>
      </main>
    );
  }

  const clienteTyped = cliente as Cliente;
  const premiosArray = Array.isArray(clienteTyped.premios)
    ? clienteTyped.premios
    : [];

  const premiosActivos = premiosArray.filter(
    (premio: Premio) => premio.estado === "activo"
  );

  const premiosUsados = premiosArray.filter(
    (premio: Premio) => premio.estado === "usado"
  );

  const sellos = clienteTyped.sellos ?? 0;
  const urlTarjeta = `https://fidelinook.vercel.app/t/${clienteTyped.id}`;

  return (
    <main className="min-h-screen bg-[#FFDBEF] p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-[#4C00F7] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10">
                <Image
                  src="/nook-logo.png"
                  alt="Nook"
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
              <p className="mt-2 text-sm text-neutral-600">{clienteTyped.correo}</p>
              <p className="text-sm text-neutral-600">{clienteTyped.telefono}</p>
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
                    {sellos} de 6 sellos
                  </p>
                </div>

                <div className="rounded-full bg-[#4C00F7] px-4 py-2 text-sm font-semibold text-white">
                  {6 - sellos} para tu premio
                </div>
              </div>

              <div className="mt-5 grid grid-cols-6 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-bold ${
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

            {premiosActivos.length > 0 && (
              <div className="rounded-2xl border border-[#4C00F7]/15 bg-[#4C00F7] p-5 text-white">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/80">
                  Premio disponible
                </p>
                <p className="mt-2 text-2xl font-bold">🎉 ¡Tienes un premio!</p>
                <p className="mt-1 text-lg">{premiosActivos[0].nombre}</p>
                <p className="mt-2 text-sm text-white/80">
                  Muéstralo en el local para canjearlo.
                </p>
              </div>
            )}
          </div>
        </div>

        <details className="overflow-hidden rounded-[24px] bg-white shadow" open>
          <summary className="cursor-pointer list-none px-6 py-5 text-xl font-bold text-[#4C00F7]">
            Premios activos
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
                    <p className="font-semibold text-[#4C00F7]">{premio.nombre}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Estado: {premio.estado}
                    </p>
                    <p className="text-sm text-neutral-600">
                      Vence: {premio.vencimiento || "Sin definir"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="overflow-hidden rounded-[24px] bg-white shadow">
          <summary className="cursor-pointer list-none px-6 py-5 text-xl font-bold text-[#4C00F7]">
            Historial de premios usados
          </summary>

          <div className="border-t border-neutral-200 px-6 py-5">
            {premiosUsados.length === 0 ? (
              <p className="text-neutral-600">Todavía no has canjeado premios.</p>
            ) : (
              <div className="space-y-3">
                {premiosUsados.map((premio: Premio) => (
                  <div
                    key={premio.id}
                    className="rounded-2xl border border-neutral-200 p-4"
                  >
                    <p className="font-semibold text-[#4C00F7]">{premio.nombre}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Estado: {premio.estado}
                    </p>
                    <p className="text-sm text-neutral-600">
                      Vencía: {premio.vencimiento || "Sin definir"}
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