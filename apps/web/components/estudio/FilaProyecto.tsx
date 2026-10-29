// Un proyecto como fila del inicio (sistema/33): quién es, en qué paso va, qué toca ahora y un solo botón.
import Link from "next/link";
import { PEDIDOS } from "@anonymo/agentes";
import type { Momento } from "@/lib/camino";
import { espacio } from "@/lib/espacio";
import { CaminoMini } from "./Camino";
import { Caras, hace } from "./piezas";

const BOTON: Record<Momento["tono"], string> = {
  toca: "bg-tinta text-white group-hover:bg-black",
  cortado: "bg-tinta text-white group-hover:bg-black",
  otro: "bg-white text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)]",
  vivo: "bg-white text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)]",
  pausa: "bg-white text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)]",
  listo: "bg-white text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)]",
};

export function FilaProyecto({ id, cliente, tipo, m, destino, caras, cuando }: { id: string; cliente: string; tipo: keyof typeof PEDIDOS; m: Momento; destino: string; caras: string[]; cuando?: string }) {
  const e = espacio(id);
  return (
    <Link
      href={destino}
      className={`group grid items-center gap-x-6 gap-y-3 rounded-[18px] bg-white p-4 pl-5 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_6px_18px_-12px_rgba(40,30,20,.2)] transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(26,24,22,.07),0_18px_36px_-18px_rgba(40,30,20,.3)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] ${m.tono === "toca" || m.tono === "cortado" ? "ring-1 ring-urgente/25" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <i aria-hidden className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: e.punto }} />
        <span className="min-w-0">
          <span className="block truncate font-serif text-[24px] leading-[1.05]">{cliente}</span>
          <span className="mt-1 block"><CaminoMini m={m} /></span>
        </span>
      </span>
      <span className="min-w-0 text-[14px] leading-snug text-medio">
        <span className="line-clamp-2">{m.ahora}</span>
        <span className="mt-0.5 block text-[12px] text-suave">{PEDIDOS[tipo].nombre} · fase {m.fase.n} de {m.fase.de} · {m.hechas}/{m.total} entregas{cuando ? ` · ${hace(cuando)}` : ""}</span>
      </span>
      <span className="flex items-center gap-3 md:justify-end">
        {caras.length > 0 && <Caras ids={caras} tam={24} max={3} />}
        <span className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-4 text-[13px] font-medium transition ${BOTON[m.tono]}`}>{m.accion} →</span>
      </span>
    </Link>
  );
}
