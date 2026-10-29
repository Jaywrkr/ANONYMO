"use client";

// Si algo falla dentro del estudio (sistema/36): nada de pantallas que asustan. Se explica qué pasó,
// se dice que lo hecho está guardado y se ofrece volver al proyecto. Nunca «reintentar» a ciegas:
// repetir una acción podría pedir el mismo trabajo dos veces.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Cara } from "@/components/estudio/piezas";

export default function ErrorEstudio({ error }: { error: Error & { digest?: string } }) {
  const ruta = usePathname() ?? "/estudio";
  const proyecto = ruta.match(/^\/estudio\/([a-z0-9_-]+)/)?.[1];
  const esProyecto = proyecto && !["nuevo", "biblioteca", "oficina", "papelera", "analitica", "pendientes"].includes(proyecto);
  const volver = esProyecto ? `/estudio/${proyecto}` : "/estudio";
  const tiempo = /tim(e|ed) ?out|504|FUNCTION_INVOCATION_TIMEOUT|tard/i.test(error.message);
  useEffect(() => console.error("[estudio]", error.digest ?? "", error.message), [error]);
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="max-w-lg text-center">
        <Cara id="sonda" tam={84} flota className="mx-auto" />
        <p className="mt-5 text-[13px] text-suave">Algo tardó o falló</p>
        <h1 className="mt-2 font-serif text-[clamp(32px,4vw,46px)] leading-[1.05]">
          {tiempo ? "Tardó más de lo normal." : "No se pudo mostrar esto."}
        </h1>
        <p className="mt-3 text-[15px] text-medio">
          Lo que el equipo ya terminó está guardado. {esProyecto ? "En el proyecto ves en qué quedó y, si hace falta, lo continúas con un toque." : "Vuelve al inicio para seguir."}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link href={volver} className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white">{esProyecto ? "Volver al proyecto" : "Volver al inicio"}</Link>
          {esProyecto && <Link href="/estudio" className="inline-flex min-h-12 items-center rounded-full px-5 text-[14px] text-medio hover:text-tinta">Ir al inicio</Link>}
        </div>
        {error.digest && <p className="mt-6 font-mono text-[11px] text-suave">ref. {error.digest}</p>}
      </div>
    </div>
  );
}
