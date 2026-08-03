import Image from "next/image";

type Props = {
  message: string;
};

export default function CustomMessageTicket80mm({ message }: Props) {
  return (
    <article className="custom-message-ticket mx-auto w-[72mm] bg-white px-[3mm] py-[2mm] font-sans text-black">
      <header className="text-center">
        <div className="flex h-[14mm] items-center justify-center overflow-hidden">
          <Image
            src="/nook-logo-negro.png"
            alt="Nook"
            width={170}
            height={70}
            priority
            className="block h-auto w-[36mm] object-contain"
          />
        </div>

        <div className="mb-[4mm] mt-[1mm] border-t border-dashed border-black" />
      </header>

      <section className="whitespace-pre-wrap break-words text-center text-[12px] font-semibold leading-[1.55]">
        {message}
      </section>

      <div className="mb-[2mm] mt-[4mm] border-t border-dashed border-black" />

      <footer className="text-center text-[9px] font-bold leading-tight">
        Equipo Nook
      </footer>
    </article>
  );
}
