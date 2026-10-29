"use client";

// Una pequeña fiesta (sistema/34): cuando apruebas una fase o el equipo arranca, caen las caras del equipo.
// Dura menos de 3 s, no tapa nada (no se puede tocar) y se apaga con «movimiento reducido».
import { useMemo } from "react";
import { AGENTES } from "@anonymo/agentes";
import { caraSvg } from "@/lib/caras";

export function Fiesta() {
  const piezas = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    id: AGENTES[i % AGENTES.length].id,
    x: Math.random() * 100,
    tam: 24 + Math.random() * 30,
    dura: 1.8 + Math.random() * 1.2,
    demora: Math.random() * 0.6,
    giro: (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 240),
  })), []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {piezas.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={caraSvg(p.id)} alt="" width={p.tam} height={p.tam * 1.08} className="cae absolute top-0"
          style={{ left: `${p.x}%`, width: p.tam, ["--dura" as string]: `${p.dura}s`, ["--demora" as string]: `${p.demora}s`, ["--giro" as string]: `${p.giro}deg` }} />
      ))}
    </div>
  );
}
