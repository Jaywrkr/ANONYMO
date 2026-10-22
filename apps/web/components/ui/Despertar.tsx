"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { idiomaDeRuta } from "@/lib/idioma";
import { estaQuieto } from "@/lib/movimiento";

// Primera visita de la sesión: una barra fina y un contador mientras el 3D despierta (web/15).
// No tapa nada: el texto de la página ya se ve. Desaparece cuando el lienzo está listo (o a los 4 s).
export function Despertar() {
  const en = idiomaDeRuta(usePathname()) === "en";
  const [n, setN] = useState(0);
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    let visto = false;
    try {
      visto = sessionStorage.getItem("anonymo-desperto") === "1";
      sessionStorage.setItem("anonymo-desperto", "1");
    } catch {}
    if (visto || estaQuieto()) return;
    setVisible(true);
    const listo = () => document.documentElement.getAttribute("data-tresd") === "1";
    let i = 0;
    const paso = setInterval(() => {
      i = Math.min(listo() ? 22 : 20, i + 1 + Math.floor(Math.random() * 2));
      setN(i);
      if (i >= 22) terminar();
    }, 70);
    const tope = setTimeout(() => terminar(), 4000);
    function terminar() {
      clearInterval(paso);
      clearTimeout(tope);
      setN(22);
      setSaliendo(true);
      setTimeout(() => setVisible(false), 600);
    }
    return () => {
      clearInterval(paso);
      clearTimeout(tope);
    };
  }, []);

  if (!visible) return null;
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[60] transition-opacity duration-500 ${saliendo ? "opacity-0" : "opacity-100"}`}>
      <div className="h-[2px] bg-tinta transition-[width] duration-150 ease-out" style={{ width: `${(n / 22) * 100}%` }} />
      <p className="fixed bottom-4 left-[max(20px,env(safe-area-inset-left))] font-mono text-[12px] uppercase tracking-[0.14em] text-gris md:left-10">
        {en ? "Waking up agents" : "Despertando agentes"} {String(n).padStart(2, "0")}/22
      </p>
    </div>
  );
}
