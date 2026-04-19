import QRCode from "react-qr-code";

type Props = {
  mostrarRegistro: boolean;
  setMostrarRegistro: (value: boolean) => void;
  setMensaje: (value: string) => void;
};

export default function AdminRegistroCard({
  mostrarRegistro,
  setMostrarRegistro,
  setMensaje,
}: Props) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setMostrarRegistro(!mostrarRegistro)}
        className="cursor-pointer flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-lg font-semibold">Registro nuevo cliente</span>
        <span className="text-2xl leading-none">
          {mostrarRegistro ? "−" : "+"}
        </span>
      </button>

      {mostrarRegistro && (
        <div className="border-t border-neutral-200 p-4 pt-4">
          <p className="mt-1 text-sm text-neutral-600">
            Escanea para registrar cliente
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="w-fit rounded border bg-white p-4">
              <QRCode
                value="https://fidelidad.nookheladeria.cl/registro"
                size={160}
              />
            </div>

            <div className="space-y-2">
              <a
                href="/registro"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit rounded bg-black px-4 py-3 text-white"
              >
                Abrir formulario
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    "https://fidelidad.nookheladeria.cl/registro"
                  );
                  setMensaje("Link de registro copiado");
                }}
                className="cursor-pointer block w-fit rounded bg-neutral-200 px-4 py-3"
              >
                Copiar link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}