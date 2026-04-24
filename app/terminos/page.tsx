export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#F4DCE8] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">

          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-white/80">
              Nook
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              Términos y condiciones
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Uso de la tarjeta Fideli-NooK
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8 space-y-4 text-sm text-[#444] leading-6">

            <p>
              Al registrarte en Fideli-NooK, aceptas participar en el programa de fidelización de Nook Heladería.
            </p>

            <p>
              Tus datos personales (nombre, correo y teléfono) serán utilizados exclusivamente para gestionar tu cuenta, tus beneficios y la operación del sistema.
            </p>

            <p>
              Si autorizas el uso para comunicaciones, podremos enviarte promociones, beneficios y campañas relacionadas con Nook.
            </p>

            <p>
              Nook no compartirá tus datos con terceros ni los utilizará para fines distintos a los descritos anteriormente.
            </p>

            <p>
              Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos directamente.
            </p>

          </div>

        </div>
      </div>
    </main>
  );
}