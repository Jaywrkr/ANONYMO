// La imagen de la muestra cuando el negocio todavía no sube sus fotos (sistema/84): un cielo de color que se mueve lento,
// con grano. Hace de foto sin usar fotos ajenas. Con su foto, se ve su foto.
import type { CSSProperties } from "react";

const GRANO = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>\")";

export function EstilosMuestra() {
  return (
    <style>{`
      @keyframes muestra-deriva { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(8%,-6%,0) scale(1.18); } }
      @keyframes muestra-gira { to { transform: rotate(360deg); } }
      @keyframes muestra-entra { from { opacity: 0; transform: translateY(18px) rotate(var(--giro, 0deg)); } to { opacity: 1; transform: translateY(0) rotate(var(--giro, 0deg)); } }
      .muestra-orbe { position: absolute; border-radius: 9999px; filter: blur(48px); animation: muestra-deriva 16s ease-in-out infinite alternate; will-change: transform; }
      .muestra-gira { animation: muestra-gira 28s linear infinite; transform-origin: center; }
      .muestra-entra { animation: muestra-entra .7s cubic-bezier(.16,1,.3,1) both; }
      @keyframes muestra-cinta { to { transform: translate3d(-50%,0,0); } }
      .muestra-cinta { display: flex; width: max-content; animation: muestra-cinta 26s linear infinite; }
      .muestra-fila summary { list-style: none; cursor: pointer; }
      .muestra-fila summary::-webkit-details-marker { display: none; }
      .muestra-fila[open] .muestra-mas { transform: rotate(45deg); }
      .muestra-mas { transition: transform .25s ease; }
      @media (prefers-reduced-motion: reduce) { .muestra-orbe, .muestra-gira, .muestra-entra, .muestra-cinta { animation: none; } }
    `}</style>
  );
}

export function Cielo({ colores, foto, alt, className = "", style }: { colores: [string, string, string]; foto?: string; alt: string; className?: string; style?: CSSProperties }) {
  const [a, b, c] = colores;
  return (
    <div className={`overflow-hidden ${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`} style={{ background: b, ...style }}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={alt} data-foto className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0">
          <span className="muestra-orbe" style={{ background: a, width: "75%", height: "70%", left: "-18%", top: "-20%" }} />
          <span className="muestra-orbe" style={{ background: c, width: "60%", height: "60%", right: "-15%", bottom: "-18%", animationDelay: "-6s", animationDuration: "21s" }} />
          <span className="muestra-orbe" style={{ background: a, width: "40%", height: "40%", right: "8%", top: "6%", opacity: 0.7, animationDelay: "-11s", animationDuration: "26s" }} />
          <span className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRANO, opacity: 0.55 }} />
        </div>
      )}
    </div>
  );
}

/** Estrellas dibujadas (no el carácter ★, que cambia con cada tipografía). */
export function Estrella({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden className={className} fill={color}><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z" /></svg>;
}

export const nota = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
