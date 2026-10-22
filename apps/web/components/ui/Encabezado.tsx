"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Reloj } from "./Reloj";

const NAV = [
  ["/agentes", "Equipo"],
  ["/sala", "Sala"],
  ["/#como", "Fases"],
  ["/casos", "Casos"],
  ["/contacto", "Contacto"],
];

export function Encabezado() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    document.documentElement.style.overflow = abierto ? "hidden" : "";
  }, [abierto]);

  return (
    <header className="relative z-[6] flex items-center justify-between gap-x-8 px-[max(20px,env(safe-area-inset-left))] py-4 font-mono text-[12px] uppercase tracking-[0.14em] md:px-10">
      <Link href="/" className="relative z-[7] flex min-h-11 items-center text-tinta">
        Anonymo<sup className="ml-1 text-gris">*</sup>
      </Link>
      <nav aria-label="Principal" className="hidden gap-6 whitespace-nowrap text-gris md:flex">
        {NAV.map(([href, t]) => (
          <Link key={href} aria-current={ruta === href ? "page" : undefined} className={`hover:text-tinta ${ruta === href ? "text-tinta" : ""}`} href={href}>{t}</Link>
        ))}
      </nav>
      <button
        className="relative z-[7] flex min-h-11 items-center md:hidden"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? "Cerrar" : "Menú"}
      </button>
      {abierto && (
        <div id="menu-movil" className="fixed inset-0 z-[6] flex flex-col justify-between bg-hueso px-[max(20px,env(safe-area-inset-left))] pb-[max(24px,env(safe-area-inset-bottom))] pt-24 md:hidden">
          <nav aria-label="Menú" className="flex flex-col">
            {NAV.map(([href, t]) => (
              <Link key={href} href={href} className="display border-b border-linea py-2 text-[56px] normal-case">
                {t}
              </Link>
            ))}
          </nav>
          <p className="text-gris"><Reloj /></p>
        </div>
      )}
    </header>
  );
}

export function Pie() {
  return (
    <footer className="relative z-[3] mt-24 border-t border-linea px-[max(20px,env(safe-area-inset-left))] py-8 md:px-10">
      <Link href="/contacto" className="display block text-[clamp(56px,10vw,160px)] hover:opacity-70">Hablemos →</Link>
      <div className="mt-8 flex flex-wrap justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.14em] text-gris">
        <span>* Nombre provisional</span>
        <nav aria-label="Pie" className="flex flex-wrap gap-5">
          {NAV.map(([href, t]) => (
            <Link key={href} className="hover:text-tinta" href={href}>{t}</Link>
          ))}
          <Link className="hover:text-tinta" href="/sistema">Sistema</Link>
        </nav>
        <span>Cuenca, Ecuador · 2026</span>
      </div>
    </footer>
  );
}
