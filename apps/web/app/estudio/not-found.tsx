import Link from "next/link";
import { Cara } from "@/components/estudio/piezas";

// Un proyecto o una entrega que no existe (o ya se borró), dentro del marco del estudio.
export default function NoEsta() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 py-16 text-center">
      <div className="max-w-md">
        <Cara id="sonda" tam={84} flota className="mx-auto buscando" />
        <p className="mt-5 font-serif text-[34px] leading-[1.05]">Eso no está en el estudio.</p>
        <p className="mt-2 text-[15px] text-medio">Puede que se haya borrado o que el enlace esté mal. Mira en la papelera o vuelve al inicio.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/estudio" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white">Volver al inicio</Link>
          <Link href="/estudio/papelera" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)]">Ver la papelera</Link>
        </div>
      </div>
    </div>
  );
}
