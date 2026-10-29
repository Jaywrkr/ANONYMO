// La caja de arriba (sistema/32): una sola entrada para buscar en todo el estudio o contarle a Atlas algo nuevo.
// Enter busca. «Contárselo a Atlas» lleva el texto a Nuevo proyecto, donde Atlas lo lee y arma el plan.
import { Cara } from "./piezas";

export function CajaAtlas({ q, enfocar }: { q?: string; enfocar?: boolean }) {
  return (
    <form role="search" action="/estudio" className="group flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-borde pb-5 focus-within:border-tinta/40">
      <Cara id="atlas" tam={34} flota titulo={false} />
      <label className="min-w-[220px] flex-1">
        <span className="sr-only">Busca en el estudio o cuéntale algo a Atlas</span>
        <input
          id="atlas"
          name="q"
          defaultValue={q}
          autoFocus={enfocar}
          autoComplete="off"
          placeholder="Busca o cuéntale algo a Atlas…"
          className="w-full bg-transparent font-serif text-[clamp(26px,3vw,34px)] italic leading-tight text-tinta sin-anillo outline-none placeholder:text-[#b3ab9f]"
        />
      </label>
      <span className="flex items-center gap-2">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_#cbc3b6]">
          Buscar <kbd className="font-mono text-[10px] text-suave">Enter</kbd>
        </button>
        <button formAction="/estudio/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tinta px-4 text-[13px] font-medium text-white transition hover:bg-black">
          Contárselo a Atlas →
        </button>
      </span>
    </form>
  );
}
