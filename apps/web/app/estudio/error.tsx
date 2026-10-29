"use client";

// Si algo falla dentro del estudio, se queda en el marco y se puede reintentar (sistema/32).
import Link from "next/link";
import { useEffect } from "react";
import { Cara } from "@/components/estudio/piezas";

export default function ErrorEstudio({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error("[estudio]", error), [error]);
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 py-16 text-center">
      <div className="max-w-md">
        <Cara id="sonda" tam={84} flota className="mx-auto" />
        <p className="mt-5 font-serif text-[34px] leading-[1.05]">Algo no cargó bien.</p>
        <p className="mt-2 text-[15px] text-medio">Sonda ya está mirando. Suele ser la nube tardando en responder: reintenta en un momento.</p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-suave">Código: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white transition hover:bg-black">Reintentar</button>
          <Link href="/estudio" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)]">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
