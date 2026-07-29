import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  center: ReactNode;
  right: ReactNode;
  context?: ReactNode;
};

export default function POSLayout({
  title,
  subtitle,
  left,
  center,
  right,
  context,
}: Props) {
  return (
    <main className="h-screen overflow-hidden bg-[#F6F3FF]">
      <div className="flex h-full">
        <aside className="flex w-20 shrink-0 flex-col items-center gap-3 border-r border-neutral-200 bg-white px-2 py-4 shadow-sm">
          <Link
            href="/operacion"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg font-black text-white transition hover:scale-105 active:scale-95"
            title="Operación"
          >
            N
          </Link>

          <Link
            href="/operacion/ventas/nueva"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl text-white transition hover:scale-105 active:scale-95"
            title="Venta"
          >
            $
          </Link>

          <Link
            href="/operacion/cola"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-xl text-neutral-700 transition hover:scale-105 hover:bg-violet-50 active:scale-95"
            title="Pedidos"
          >
            ⏱
          </Link>

          <Link
            href="/operacion/catalogo"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-xl text-neutral-700 transition hover:scale-105 hover:bg-violet-50 active:scale-95"
            title="Catálogo"
          >
            📦
          </Link>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight text-neutral-900">
                {title}
              </h1>

              {subtitle && (
                <p className="truncate text-xs text-neutral-500">{subtitle}</p>
              )}
            </div>

            <div className="shrink-0 text-right text-xs text-neutral-500">
              <p className="font-semibold text-neutral-800">Caja local</p>
              <p>{new Date().toLocaleDateString("es-CL")}</p>
            </div>
          </header>

          <div
            className={`grid min-h-0 min-w-0 flex-1 gap-2 overflow-hidden p-2 ${
              left
                ? "grid-cols-[200px_minmax(0,1fr)_330px_260px]"
                : "grid-cols-[minmax(0,1fr)_330px_260px]"
            }`}
          >
            {left && (
              <section className="min-h-0 min-w-0 overflow-y-auto rounded-2xl bg-white p-2 shadow-sm">
                {left}
              </section>
            )}

            <section className="min-h-0 min-w-0 overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
              {center}
            </section>

            <section className="min-h-0 min-w-0 overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
              {right}
            </section>

            <section className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl bg-white p-2 shadow-sm">
              {context}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
