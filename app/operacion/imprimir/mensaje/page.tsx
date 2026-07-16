"use client";

import { useEffect, useRef, useState } from "react";

import CustomMessageTicket80mm from "../../../../components/documents/CustomMessageTicket80mm";

const STORAGE_KEY = "nook-custom-print-message";

export default function ImprimirMensajePage() {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const automaticPrintStarted = useRef(false);

  useEffect(() => {
    try {
      const storedMessage =
        window.sessionStorage.getItem(STORAGE_KEY)?.trim() || "";

      if (!storedMessage) {
        setErrorMessage(
          "No se encontró un mensaje personalizado para imprimir.",
        );
        return;
      }

      setMessage(storedMessage);
    } catch (error) {
      console.error("Error recuperando mensaje personalizado:", error);

      setErrorMessage("No se pudo recuperar el mensaje personalizado.");
    }
  }, []);

  useEffect(() => {
    if (!message || automaticPrintStarted.current) {
      return;
    }

    automaticPrintStarted.current = true;

    void imprimirCuandoEsteListo();
  }, [message]);

  useEffect(() => {
    function handleAfterPrint() {
      window.parent.postMessage(
        {
          type: "NOOK_PRINT_COMPLETED",
          documentType: "custom-message",
        },
        window.location.origin,
      );
    }

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  async function esperarImagenes() {
    const images = Array.from(window.document.images);

    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            const finish = () => resolve();

            image.addEventListener("load", finish, {
              once: true,
            });

            image.addEventListener("error", finish, {
              once: true,
            });
          }),
      ),
    );
  }

  async function imprimirCuandoEsteListo() {
    try {
      await esperarImagenes();

      window.setTimeout(() => {
        window.print();
      }, 350);
    } catch (error) {
      console.error("No se pudo iniciar la impresión del mensaje:", error);
    }
  }

  return (
    <main className="min-h-screen bg-white print:min-h-0">
      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white;
          }

          body * {
            visibility: hidden;
          }

          .print-root,
          .print-root * {
            visibility: visible;
          }

          .print-root {
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
          }

          .custom-message-ticket {
            width: 72mm !important;
            min-height: auto !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {errorMessage ? (
        <div className="p-6 text-center text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : message ? (
        <div className="print-root mx-auto w-[80mm] bg-white">
          <CustomMessageTicket80mm message={message} />
        </div>
      ) : null}
    </main>
  );
}
