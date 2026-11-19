// La imagen de la muestra cuando el negocio todavía no sube sus fotos (sistema/84): un cielo de color que se mueve lento,
// con grano. Hace de foto sin usar fotos ajenas. Con su foto, se ve su foto.
import { Fragment, type CSSProperties } from "react";

const GRANO = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>\")";

export function EstilosMuestra() {
  return (
    <style>{`
      @keyframes muestra-deriva { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(8%,-6%,0) scale(1.18); } }
      @keyframes muestra-gira { to { transform: rotate(360deg); } }
      @keyframes muestra-entra { from { opacity: 0; transform: translateY(18px) rotate(var(--giro, 0deg)); } to { opacity: 1; transform: translateY(0) rotate(var(--giro, 0deg)); } }
      .muestra-orbe { position: absolute; border-radius: 9999px; filter: blur(48px); animation: muestra-deriva 16s ease-in-out infinite alternate; will-change: transform; }
      .muestra-gira { animation: muestra-gira 28s linear infinite; transform-origin: center; }
      .muestra-entra { animation: muestra-entra .8s cubic-bezier(.16,1,.3,1) both; }
      @keyframes muestra-cinta { to { transform: translate3d(-50%,0,0); } }
      .muestra-cinta { display: flex; width: max-content; animation: muestra-cinta 26s linear infinite; }
      .muestra-fila summary { list-style: none; cursor: pointer; }
      .muestra-fila summary::-webkit-details-marker { display: none; }
      .muestra-fila[open] .muestra-mas { transform: rotate(45deg); }
      .muestra-mas { transition: transform .35s cubic-bezier(.16,1,.3,1); }

      /* Desde sistema/87: el nombre entra palabra por palabra. */
      @keyframes muestra-palabra { from { opacity: 0; transform: translateY(.45em) rotate(var(--tuerce, 3deg)); filter: blur(var(--nube, 0px)); } to { opacity: 1; transform: none; filter: none; } }
      .muestra-palabra { display: inline-block; animation: muestra-palabra 1s cubic-bezier(.16,1,.3,1) both; animation-delay: calc(var(--i, 0) * 85ms + var(--desde, 0ms)); }
      /* La imagen de portada se abre de abajo hacia arriba. */
      @keyframes muestra-abre { from { clip-path: inset(18% 6% 0 6% round 40px); opacity: 0; } to { clip-path: inset(0 0 0 0 round 0px); opacity: 1; } }
      .muestra-abre { animation: muestra-abre 1.2s cubic-bezier(.16,1,.3,1) .25s both; }
      /* Las fichas que flotan se mecen despacio. */
      @keyframes muestra-mece { to { translate: 0 -8px; } }
      .muestra-mece { animation: muestra-entra .8s cubic-bezier(.16,1,.3,1) both, muestra-mece 4.5s ease-in-out 1.2s infinite alternate; }
      /* El punto de «abierto hoy» late. */
      @keyframes muestra-late { from { transform: scale(1); opacity: .7; } to { transform: scale(3.2); opacity: 0; } }
      .muestra-late { position: relative; }
      .muestra-late::after { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: inherit; animation: muestra-late 1.8s ease-out infinite; }
      /* Un brillo cruza el botón principal cada tanto. */
      @keyframes muestra-brillo { 0%, 62% { transform: translateX(-130%) skewX(-18deg); } 100% { transform: translateX(330%) skewX(-18deg); } }
      .muestra-brilla { position: relative; overflow: hidden; isolation: isolate; }
      .muestra-brilla::after { content: ""; position: absolute; inset: 0 auto 0 0; width: 42%; z-index: -1; background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent); animation: muestra-brillo 4.2s ease-in-out 1.4s infinite; pointer-events: none; }
      /* El resplandor del botón de «Noche» respira. */
      @keyframes muestra-respira { to { box-shadow: 0 0 0 1px var(--luz), 0 14px 64px -2px var(--luz); } }
      .muestra-respira { animation: muestra-respira 2.6s ease-in-out infinite alternate; }
      /* Las estrellas saltan una por una. */
      @keyframes muestra-salta { from { opacity: 0; transform: scale(.2) rotate(-40deg); } 70% { transform: scale(1.25) rotate(6deg); } to { opacity: 1; transform: none; } }
      .muestra-estrellas > * { animation: muestra-salta .55s cubic-bezier(.3,1.4,.5,1) both; }
      .muestra-estrellas > :nth-child(1) { animation-delay: .7s; } .muestra-estrellas > :nth-child(2) { animation-delay: .8s; } .muestra-estrellas > :nth-child(3) { animation-delay: .9s; } .muestra-estrellas > :nth-child(4) { animation-delay: 1s; } .muestra-estrellas > :nth-child(5) { animation-delay: 1.1s; }

      /* Los botones responden al dedo y al cursor. */
      [data-plantilla] [data-demo], [data-plantilla] a[target] { transition: transform .3s cubic-bezier(.16,1,.3,1), filter .3s ease; }
      [data-plantilla] [data-demo]:active, [data-plantilla] a[target]:active { transform: scale(.95); }
      @media (hover: hover) {
        [data-plantilla] [data-demo]:hover, [data-plantilla] a[target]:hover { transform: translateY(-3px); filter: brightness(1.05); }
        [data-plantilla] [data-demo]:hover .muestra-flecha { transform: translate(3px,-3px) rotate(0deg); }
        [data-plantilla] nav a { transition: opacity .2s ease; }
        [data-plantilla] nav a:hover { opacity: .6; }
        .muestra-tarjeta { transition: transform .5s cubic-bezier(.16,1,.3,1); }
        .muestra-tarjeta:hover { transform: translateY(-6px); }
      }
      .muestra-flecha { transition: transform .35s cubic-bezier(.16,1,.3,1); }

      /* Lo que se abre al tocar, se abre con calma (donde el navegador lo permite). */
      .muestra-fila { interpolate-size: allow-keywords; }
      .muestra-fila::details-content { block-size: 0; overflow: clip; opacity: 0; transition: block-size .5s cubic-bezier(.16,1,.3,1), opacity .4s ease, content-visibility .5s allow-discrete; }
      .muestra-fila[open]::details-content { block-size: auto; opacity: 1; }

      /* Al bajar: solo cuando el navegador ya está mirando (la clase la pone Movimiento.tsx). */
      .muestra-viva [data-aparece] { opacity: 0; transform: translate3d(0,34px,0); transition: opacity .9s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1); transition-delay: calc(var(--n, 0) * 95ms); }
      .muestra-viva [data-aparece="escala"] { transform: scale(.93); }
      .muestra-viva [data-aparece="lado"] { transform: translate3d(-34px,0,0); }
      /* «corta»: la imagen se destapa de arriba hacia abajo. Se recorta lo de adentro, no el marco: un marco recortado del todo no cuenta como visible y nunca aparecería. */
      .muestra-viva [data-aparece="corta"] { opacity: 1; transform: none; }
      .muestra-viva [data-aparece="corta"] > * { clip-path: inset(0 0 100% 0); transition: clip-path 1.2s cubic-bezier(.16,1,.3,1); transition-delay: calc(var(--n, 0) * 95ms); }
      .muestra-viva [data-aparece].visto { opacity: 1; transform: none; }
      .muestra-viva [data-aparece="corta"].visto > * { clip-path: inset(0 0 0 0); }
      .muestra-viva .muestra-lee { opacity: .2; transition: opacity .35s ease; }
      .muestra-viva .muestra-lee.leida { opacity: 1; }
      [data-flota] { will-change: translate; }

      @media (prefers-reduced-motion: reduce) {
        .muestra-orbe, .muestra-gira, .muestra-entra, .muestra-cinta, .muestra-palabra, .muestra-abre, .muestra-mece, .muestra-late::after, .muestra-brilla::after, .muestra-respira, .muestra-estrellas > * { animation: none; }
        .muestra-fila::details-content { transition: none; }
      }
    `}</style>
  );
}

/** `flota`: cuánto más lento que la página se desplaza la imagen al bajar (0 = quieta). */
export function Cielo({ colores, foto, alt, className = "", style, flota = 0.08 }: { colores: [string, string, string]; foto?: string; alt: string; className?: string; style?: CSSProperties; flota?: number }) {
  const [a, b, c] = colores;
  return (
    <div className={`overflow-hidden ${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`} style={{ background: b, ...style }}>
      {/* La capa de adentro es más alta que el marco: así puede desplazarse sin dejar bordes vacíos. */}
      <div aria-hidden={!foto} data-flota={flota || undefined} className={`absolute inset-x-0 ${flota ? "-inset-y-[9%]" : "inset-y-0"}`}>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={alt} data-foto className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="muestra-orbe" style={{ background: a, width: "75%", height: "70%", left: "-18%", top: "-20%" }} />
            <span className="muestra-orbe" style={{ background: c, width: "60%", height: "60%", right: "-15%", bottom: "-18%", animationDelay: "-6s", animationDuration: "21s" }} />
            <span className="muestra-orbe" style={{ background: a, width: "40%", height: "40%", right: "8%", top: "6%", opacity: 0.7, animationDelay: "-11s", animationDuration: "26s" }} />
            <span className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRANO, opacity: 0.55 }} />
          </>
        )}
      </div>
    </div>
  );
}

/** Estrellas dibujadas (no el carácter ★, que cambia con cada tipografía). */
export function Estrella({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden className={className} fill={color}><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z" /></svg>;
}

export const nota = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** El nombre (o cualquier titular) palabra por palabra: cada una entra un instante después de la anterior. */
export function Palabras({ texto, desde = 0 }: { texto: string; desde?: number }) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  return <>{palabras.map((p, i) => <Fragment key={i}><span className="muestra-palabra" style={{ ["--i" as string]: i, ["--desde" as string]: `${desde}ms` }}>{p}</span>{i < palabras.length - 1 ? " " : null}</Fragment>)}</>;
}

/** La frase grande, que se va encendiendo palabra por palabra mientras se baja por la página. */
export function Lee({ texto }: { texto: string }) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  return <span data-lee>{palabras.map((p, i) => <Fragment key={i}><span className="muestra-lee">{p}</span>{i < palabras.length - 1 ? " " : null}</Fragment>)}</span>;
}

/** Un número que cuenta desde cero cuando llega a la vista. Sin movimiento, se lee el número de siempre. */
export function Cuenta({ valor, decimales = 0 }: { valor: number; decimales?: number }) {
  return <span data-cuenta={valor} data-decimales={decimales}>{valor.toLocaleString("es-EC", { minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: false })}</span>;
}

/** El punto verde (o rojo) de «abierto hoy», que late. */
export function Punto({ abierto, noche = false, className = "h-2 w-2" }: { abierto: boolean; noche?: boolean; className?: string }) {
  const color = abierto ? (noche ? "#3ddc84" : "#21b866") : noche ? "#ff6b5e" : "#d1483b";
  return <span className={`${abierto ? "muestra-late" : ""} shrink-0 rounded-full ${className}`} style={{ background: color, boxShadow: noche ? `0 0 10px ${color}` : undefined }} />;
}
