"use client";

// El movimiento de la muestra al bajar (sistema/87): las secciones aparecen, los números cuentan, la imagen se desplaza
// un poco más lento que la página y la frase grande se va «leyendo». Sin esto la página se ve completa igual:
// nada queda escondido si el navegador no corre este código o si la persona pidió menos movimiento.
import { useEffect } from "react";

const entre = (n: number) => Math.min(1, Math.max(0, n));

export function Movimiento() {
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>("[data-plantilla]");
    if (!raiz || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Lo que ya está a la vista al abrir no se esconde: solo se anima lo que viene después.
    for (const el of raiz.querySelectorAll<HTMLElement>("[data-aparece]")) if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("visto");
    raiz.classList.add("muestra-viva");

    const contar = (el: HTMLElement) => {
      const fin = Number(el.dataset.cuenta), dec = Number(el.dataset.decimales ?? 0), t0 = performance.now();
      if (!Number.isFinite(fin)) return;
      const cuadro = (t: number) => {
        const p = entre((t - t0) / 1300);
        el.textContent = (fin * (1 - (1 - p) ** 4)).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: false });
        if (p < 1) requestAnimationFrame(cuadro);
      };
      requestAnimationFrame(cuadro);
    };

    const ojo = new IntersectionObserver((vistas) => {
      for (const v of vistas) {
        if (!v.isIntersecting) continue;
        const el = v.target as HTMLElement;
        ojo.unobserve(el);
        if (el.dataset.cuenta !== undefined) contar(el); else el.classList.add("visto");
      }
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.06 });
    const mirar = () => { for (const el of raiz.querySelectorAll<HTMLElement>("[data-aparece]:not(.visto), [data-cuenta]:not([data-contado])")) { if (el.dataset.cuenta !== undefined) el.dataset.contado = "1"; ojo.observe(el); } };
    mirar();
    // Cuando el negocio sube sus fotos la página se rehace: lo nuevo también se mira, o quedaría escondido.
    const cambios = new MutationObserver(mirar);
    cambios.observe(raiz, { childList: true, subtree: true });

    let pedido = 0;
    const mover = () => {
      pedido = 0;
      const alto = window.innerHeight;
      for (const el of raiz.querySelectorAll<HTMLElement>("[data-flota]")) {
        const r = el.parentElement!.getBoundingClientRect();
        if (r.bottom < -80 || r.top > alto + 80) continue;
        el.style.translate = `0 ${((alto / 2 - (r.top + r.height / 2)) * Number(el.dataset.flota)).toFixed(1)}px`;
      }
      for (const el of raiz.querySelectorAll<HTMLElement>("[data-lee]")) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > alto + 80) continue;
        const palabras = el.querySelectorAll(".muestra-lee");
        const hasta = Math.round(entre((alto * 0.88 - r.top) / (alto * 0.45 + r.height * 0.7)) * palabras.length);
        palabras.forEach((p, i) => p.classList.toggle("leida", i < hasta));
      }
    };
    const alMover = () => { pedido ||= requestAnimationFrame(mover); };
    mover();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => { ojo.disconnect(); cambios.disconnect(); window.removeEventListener("scroll", alMover); window.removeEventListener("resize", alMover); if (pedido) cancelAnimationFrame(pedido); raiz.classList.remove("muestra-viva"); };
  }, []);
  return null;
}
