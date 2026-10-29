"use client";

// El vigía del estudio (sistema/36): mira cada rato si hay algo nuevo que te toca (un agente entregó, el cliente escribió,
// el equipo se detuvo). Si lo hay, avisa con una notificación del navegador y un sonido corto, y refresca la página.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Aviso = { clave: string; href: string; titulo: string; detalle: string };

/** Dos notas suaves (las de Jay y Luna), sintetizadas: no hace falta un archivo de sonido. */
function sonar() {
  try {
    const ctx = new AudioContext();
    [659.25, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {}
}

export function Vigia({ inicial }: { inicial: string[] }) {
  const router = useRouter();
  const vistos = useRef(new Set(inicial));
  useEffect(() => {
    let vivo = true;
    let espera: ReturnType<typeof setTimeout>;
    const mirar = async () => {
      try {
        const r = await fetch("/estudio/pendientes", { cache: "no-store" });
        if (r.ok && vivo) {
          const { avisos } = (await r.json()) as { avisos: Aviso[] };
          const nuevos = avisos.filter((a) => !vistos.current.has(a.clave));
          avisos.forEach((a) => vistos.current.add(a.clave));
          if (nuevos.length) {
            sonar();
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              for (const a of nuevos.slice(0, 3)) {
                const n = new Notification(`Anonymo · ${a.titulo}`, { body: a.detalle, tag: a.clave });
                n.onclick = () => { window.focus(); router.push(a.href); n.close(); };
              }
            }
            dispatchEvent(new CustomEvent("anonymo:pendientes", { detail: nuevos.length }));
            router.refresh();
          }
        }
      } catch {}
      // Más seguido con la pestaña a la vista; más espaciado en segundo plano.
      if (vivo) espera = setTimeout(mirar, document.visibilityState === "visible" ? 15_000 : 30_000);
    };
    espera = setTimeout(mirar, 15_000);
    return () => { vivo = false; clearTimeout(espera); };
  }, [router]);
  return null;
}
