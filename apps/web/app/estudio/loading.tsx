import { Cara } from "@/components/estudio/piezas";

// Mientras baja de la nube: Atlas flotando y el esqueleto del tablero (sistema/32).
export default function Cargando() {
  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9" aria-busy="true" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded-full bg-[#efebe4]" />
      <div className="mt-3 h-10 w-[min(560px,80%)] animate-pulse rounded-full bg-[#efebe4]" />
      <div className="mt-8 flex items-center gap-4 border-b border-borde pb-5">
        <Cara id="atlas" tam={34} flota titulo={false} />
        <span className="font-serif text-[28px] italic text-[#c9c1b4]">Trayendo el estudio…</span>
      </div>
      <div className="mamposteria mt-8">
        {[180, 260, 140, 220, 160, 240].map((h, i) => <div key={i} className="tarjeta animate-pulse bg-[#f3efe8]" style={{ height: h }} />)}
      </div>
    </div>
  );
}
