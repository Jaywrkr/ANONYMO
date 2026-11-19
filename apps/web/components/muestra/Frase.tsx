"use client";

// La frase grande de la muestra se va encendiendo palabra por palabra mientras se baja (sistema/87).
// Sin JavaScript o con «reducir movimiento» se ve entera desde el principio.
import { useEffect, useRef, type CSSProperties } from "react";

export function Frase({ texto, className = "", style }: { texto: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const palabras = Array.from(el.querySelectorAll<HTMLElement>("[data-palabra]"));
    let cuadro = 0;
    const pintar = () => {
      cuadro = 0;
      const r = el.getBoundingClientRect();
      const alto = window.innerHeight;
      // 0 cuando la frase asoma por abajo, 1 cuando ya pasó el centro de la pantalla.
      const avance = Math.min(1, Math.max(0, (alto * 0.92 - r.top) / (alto * 0.5 + r.height * 0.6)));
      palabras.forEach((p, i) => { p.style.opacity = String(Math.min(1, Math.max(0.16, avance * (palabras.length + 2) - i))); });
    };
    const alMover = () => { cuadro ||= window.requestAnimationFrame(pintar); };
    pintar();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => { window.removeEventListener("scroll", alMover); window.removeEventListener("resize", alMover); if (cuadro) window.cancelAnimationFrame(cuadro); };
  }, []);
  return (
    <p ref={ref} data-frase className={className} style={style}>
      {texto.split(" ").map((p, i) => <span key={i} data-palabra style={{ transition: "opacity .25s linear" }}>{p}{" "}</span>)}
    </p>
  );
}
