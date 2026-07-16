"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const STORAGE_KEY = "nook-custom-print-message";
const MAX_LENGTH = 600;

export default function CustomMessagePrintModal({ open, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!open) {
      setMessage("");
      setFeedback("");
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function imprimirMensaje() {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      setFeedback("Escribe un mensaje antes de imprimir.");
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, normalizedMessage);

      const iframe = window.document.createElement("iframe");

      iframe.title = "Impresión de mensaje personalizado Nook";

      iframe.setAttribute("aria-hidden", "true");

      iframe.src = "/operacion/imprimir/mensaje";

      Object.assign(iframe.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: "80mm",
        height: "1px",
        border: "0",
        opacity: "0",
        pointerEvents: "none",
      });

      let cleaned = false;

      function cleanup() {
        if (cleaned) return;

        cleaned = true;

        window.clearTimeout(cleanupTimeout);

        window.removeEventListener("message", handlePrintMessage);

        iframe.remove();

        window.sessionStorage.removeItem(STORAGE_KEY);
      }

      function handlePrintMessage(event: MessageEvent) {
        if (event.origin !== window.location.origin) {
          return;
        }

        if (
          event.data?.type === "NOOK_PRINT_COMPLETED" &&
          event.data?.documentType === "custom-message"
        ) {
          window.setTimeout(cleanup, 500);
        }
      }

      window.addEventListener("message", handlePrintMessage);

      const cleanupTimeout = window.setTimeout(cleanup, 60000);

      window.document.body.appendChild(iframe);

      setFeedback("Preparando impresión...");
    } catch (error) {
      console.error("Error imprimiendo mensaje personalizado:", error);

      setFeedback("No se pudo preparar la impresión.");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-600">
              Impresión libre
            </p>

            <h2 className="mt-1 text-lg font-black text-neutral-900">
              Mensaje personalizado
            </h2>

            <p className="mt-1 text-[11px] leading-snug text-neutral-500">
              Escribe un mensaje para imprimir en papel térmico de 80 mm.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </header>

        <div className="mt-4">
          <textarea
            autoFocus
            value={message}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, MAX_LENGTH));

              setFeedback("");
            }}
            rows={8}
            maxLength={MAX_LENGTH}
            placeholder={`Ejemplo:\n\nMuchas gracias por preferirnos nuevamente.\nEsperamos que disfrutes este pequeño regalo.`}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-[10px] text-neutral-400">
              Se respetarán los saltos de línea.
            </p>

            <p className="text-[10px] font-semibold text-neutral-500">
              {message.length}/{MAX_LENGTH}
            </p>
          </div>
        </div>

        {feedback && (
          <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-700">
            {feedback}
          </p>
        )}

        <footer className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={imprimirMensaje}
            disabled={!message.trim()}
            className="cursor-pointer rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir
          </button>
        </footer>
      </section>
    </div>
  );
}
