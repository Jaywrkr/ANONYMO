// El saludo al abrir la muestra (sistema/87): una cortina del color de su marca con su nombre y su nota de Google,
// que se levanta sola y deja ver la página. Es el único momento «de entrada» de la muestra. Es solo CSS: no espera
// a que cargue nada, no tapa los toques y con «reducir movimiento» no aparece.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { TITULAR, type Paleta } from "./estilos";
import { Estrella, nota } from "./Cielo";

export function Saludo({ c, k }: { c: ContenidoMuestra; k: Paleta }) {
  const [fondo, tinta] = c.plantilla === "noche" ? [k.fondo, k.tinta] : [k.bloque, k.sobreBloque];
  const titular = { ...TITULAR[c.plantilla], ...(c.plantilla === "revista" ? { fontWeight: 800 } : c.plantilla === "grafico" || c.plantilla === "mosaico" ? { fontWeight: 700 } : {}) };
  const grande = c.plantilla === "revista" ? "text-[clamp(44px,13vw,120px)] leading-[.86]" : c.plantilla === "mosaico" ? "text-[clamp(32px,8.8vw,68px)] leading-[1] tracking-[-0.05em]" : "text-[clamp(40px,11vw,88px)] leading-[.96] tracking-[-0.03em]";
  return (
    <div data-saludo aria-hidden className="muestra-saludo pointer-events-none fixed inset-0 z-[60] flex flex-col justify-between px-6 py-8 md:px-12 md:py-12" style={{ background: fondo, color: tinta }}>
      <style>{`
        @keyframes saludo-sube { to { transform: translate3d(0,-101%,0); visibility: hidden; } }
        @keyframes saludo-linea { from { opacity: 0; transform: translate3d(0,28px,0); } to { opacity: 1; transform: none; } }
        .muestra-saludo { animation: saludo-sube .9s cubic-bezier(.76,0,.24,1) 2.5s both; will-change: transform; }
        .muestra-saludo > * { animation: saludo-linea .8s cubic-bezier(.16,1,.3,1) both; }
        .muestra-saludo > :nth-child(3) { animation-delay: .15s; }
        .muestra-saludo > :nth-child(4) { animation-delay: .55s; }
        @media (prefers-reduced-motion: reduce) { .muestra-saludo { display: none; } }
      `}</style>
      <p className="text-[13px] opacity-80">Una idea de ANONYMO</p>
      <p style={titular} className={`max-w-[16ch] text-balance ${grande}`}>
        {c.nombre}: hicimos esto para ustedes.
      </p>
      {c.estrellas ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] md:text-[17px]">
          <Estrella className="h-4 w-4" />
          <span>{nota(c.estrellas)} en Google con {c.resenas} reseñas. Su web debería estar a esa altura.</span>
        </p>
      ) : <p className="text-[15px] md:text-[17px]">Así podría verse su web.</p>}
    </div>
  );
}
