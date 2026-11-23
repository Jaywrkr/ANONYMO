"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoUnmake } from "@/components/estudio/LogoUnmake";

// El marco de las páginas sueltas de Unmake (sistema/102): el logo arriba y una línea abajo.
// La web de la agencia (/) y el laboratorio (/lab) son páginas completas y no pasan por aquí.
const esInterna = (ruta: string) => /^\/(estudio|entrar|imprimir)(\/|$)/.test(ruta);
// La muestra para un prospecto (/m, sistema/72) es la web de otro negocio: sin el marco de Unmake.
// La propuesta (/p, sistema/80) es un documento para un solo negocio: también sin menú.
const esPortal = (ruta: string) => /^\/(portal|m|p|jay)(\/|$)/.test(ruta);

export function Encabezado() {
  const ruta = usePathname() ?? "";
  // El estudio, su entrada y el portal tienen su propio marco (sistema/32).
  if (esInterna(ruta) || esPortal(ruta)) return null;
  return (
    <header className="flex items-center justify-between px-6 py-6 md:px-12">
      <Link href="/" aria-label="Unmake, inicio" className="block text-tinta"><LogoUnmake className="h-[26px] w-auto" /></Link>
      <Link href="/contacto" className="font-mono text-[13px] text-tinta">hablemos</Link>
    </header>
  );
}

export function Pie() {
  const ruta = usePathname() ?? "";
  if (esInterna(ruta) || esPortal(ruta)) return null;
  return (
    <footer className="mt-24 flex flex-wrap justify-between gap-3 border-t border-linea px-6 py-7 font-mono text-[13px] text-gris md:px-12">
      <span>unmake. © 2026</span>
      <span>diseño, tecnología y comunicación</span>
    </footer>
  );
}
