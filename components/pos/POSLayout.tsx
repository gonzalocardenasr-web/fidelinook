import { ReactNode } from "react";

type Props = {
  center: ReactNode;
  right: ReactNode;
  context?: ReactNode;
};

export default function POSLayout({ center, right, context }: Props) {
  const surfaceClass =
    "min-h-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm";

  return (
    <main className="h-full overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)] gap-2">
        <section className={surfaceClass}>{center}</section>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-2">
          <section className={surfaceClass}>{right}</section>

          {context && (
            <section className={`${surfaceClass} p-3`}>{context}</section>
          )}
        </div>
      </div>
    </main>
  );
}
