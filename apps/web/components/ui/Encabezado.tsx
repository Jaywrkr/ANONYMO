"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Reloj } from "./Reloj";
import { InterruptorMovimiento } from "./Movimiento";
import { enlace, idiomaDeRuta, otroIdioma } from "@/lib/idioma";
import { T } from "@/lib/textos";

function useNav() {
  const ruta = usePathname();
  const idioma = idiomaDeRuta(ruta);
  const t = T[idioma];
  const nav: [string, string][] = [
    [enlace("/agentes", idioma), t.nav.equipo],
    [enlace("/sala", idioma), t.nav.sala],
    [enlace("/#como", idioma), t.nav.fases],
    [enlace("/casos", idioma), t.nav.casos],
    [enlace("/contacto", idioma), t.nav.contacto],
  ];
  return { ruta, idioma, t, nav, otro: otroIdioma(ruta) };
}

export function Encabezado() {
  const [abierto, setAbierto] = useState(false);
  const { ruta, idioma, t, nav: NAV, otro } = useNav();
  useEffect(() => setAbierto(false), [ruta]);
  // El idioma de la página para lectores de pantalla y buscadores.
  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.style.overflow = abierto ? "hidden" : "";
    if (!abierto) return;
    // Teclado: el foco entra al menú, Escape lo cierra y el foco queda dentro mientras está abierto.
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
      if (e.key === "Tab" && menu.current) {
        const f = [boton.current!, ...menu.current.querySelectorAll<HTMLElement>("a")];
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1)!.focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  return (
    <header className="relative z-[6] flex items-center justify-between gap-x-8 px-[max(20px,env(safe-area-inset-left))] py-4 font-mono text-[12px] uppercase tracking-[0.14em] md:px-10">
      <Link href={enlace("/", idioma)} className="relative z-[7] flex min-h-11 items-center text-tinta">
        Anonymo<sup className="ml-1 text-gris">*</sup>
      </Link>
      <nav aria-label="Principal" className="hidden gap-6 whitespace-nowrap text-gris md:flex">
        {NAV.map(([href, t]) => (
          <Link key={href} aria-current={ruta === href ? "page" : undefined} className={`hover:text-tinta ${ruta === href ? "text-tinta" : ""}`} href={href}>{t}</Link>
        ))}
        <Link href={otro.href} hrefLang={otro.idioma} lang={otro.idioma} className="hover:text-tinta" aria-label={t.cambiar}>{t.cambiarCorto}</Link>
      </nav>
      <button
        ref={boton}
        className="relative z-[7] flex min-h-11 items-center md:hidden"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? t.cerrar : t.menu}
      </button>
      {abierto && (
        <div id="menu-movil" ref={menu} role="dialog" aria-modal="true" aria-label={t.menu} className="fixed inset-0 z-[6] flex flex-col justify-between bg-hueso px-[max(20px,env(safe-area-inset-left))] pb-[max(24px,env(safe-area-inset-bottom))] pt-24 md:hidden">
          <nav aria-label="Menú" className="flex flex-col">
            {NAV.map(([href, t]) => (
              <Link key={href} href={href} className="display border-b border-linea py-2 text-[56px] normal-case">
                {t}
              </Link>
            ))}
            <Link href={otro.href} hrefLang={otro.idioma} lang={otro.idioma} className="mt-6 font-mono text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">{t.cambiar}</Link>
          </nav>
          <p className="text-gris"><Reloj /></p>
        </div>
      )}
    </header>
  );
}

export function Pie() {
  const { idioma, t, nav: NAV, otro } = useNav();
  return (
    <footer className="relative z-[3] mt-24 border-t border-linea px-[max(20px,env(safe-area-inset-left))] py-8 md:px-10">
      <Link href={enlace("/contacto", idioma)} className="display block text-[clamp(56px,10vw,160px)] hover:opacity-70">{t.hablemos}</Link>
      <div className="mt-8 flex flex-wrap justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.14em] text-gris">
        <span>{t.provisional}</span>
        <nav aria-label="Pie" className="flex flex-wrap gap-5">
          {NAV.map(([href, t]) => (
            <Link key={href} className="hover:text-tinta" href={href}>{t}</Link>
          ))}
          <Link className="hover:text-tinta" href="/sistema">{t.nav.sistema}</Link>
          <Link className="hover:text-tinta" href={otro.href} hrefLang={otro.idioma} lang={otro.idioma}>{t.cambiar}</Link>
          <InterruptorMovimiento />
        </nav>
        <span>{t.lugar}</span>
      </div>
    </footer>
  );
}
