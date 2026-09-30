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
    <main className="h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F6F3FF]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-neutral-950">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-neutral-500">
                {subtitle}
              </p>
            )}
          </div>

          {left && <div className="shrink-0">{left}</div>}
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
          <section className="min-h-0 overflow-hidden border-r border-neutral-200 bg-white">
            {center}
          </section>

          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_260px]">
            <section className="min-h-0 overflow-hidden bg-[#F6F3FF]">
              {right}
            </section>

            {context && (
              <section className="min-h-0 overflow-hidden border-l border-neutral-200 bg-white p-3">
                {context}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
