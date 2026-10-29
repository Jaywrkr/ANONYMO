"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { medir } from "@/lib/medir";

// Una vista por página (sin el estudio ni portales). Plausible es opcional: NEXT_PUBLIC_PLAUSIBLE_DOMAIN.
export function Medicion() {
  const ruta = usePathname();
  useEffect(() => {
    if (ruta.startsWith("/estudio") || ruta.startsWith("/portal") || ruta.startsWith("/imprimir")) return;
    medir("vista");
  }, [ruta]);
  const dominio = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return dominio ? <Script src="https://plausible.io/js/script.js" data-domain={dominio} strategy="afterInteractive" /> : null;
}
