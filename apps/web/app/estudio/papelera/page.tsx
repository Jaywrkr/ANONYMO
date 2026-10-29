import Link from "next/link";
import { borrarProyecto, borrarRemoto, listarPapelera, nubeActiva } from "@anonymo/pipeline";
import { PEDIDOS } from "@anonymo/agentes";
import { traerTodo } from "@/lib/nube";
import { etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { Confirmar } from "@/components/estudio/Confirmar";
import { hace } from "@/components/estudio/piezas";
import { accionBorrar, accionSacarDePapelera } from "../acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Papelera — Estudio", robots: { index: false } };

// Lo que se mandó a la papelera. A los 30 días se borra solo.
export default async function Papelera() {
  await exigirEstudio();
  await traerTodo();
  // Vaciado automático: lo que cumplió 30 días se borra al abrir la papelera.
  for (const { p, quedan } of listarPapelera()) {
    if (quedan > 0) continue;
    try {
      if (nubeActiva()) await borrarRemoto(p.pedido.id);
      borrarProyecto(p.pedido.id);
    } catch {}
  }
  const lista = listarPapelera();
  return (
    <main className={`${lateral} pb-20`}>
      <p className="pt-4"><Link href="/estudio" className={etiqueta}>← Estudio</Link></p>
      <h1 className="display mt-2 text-[clamp(52px,7vw,112px)] leading-none">Papelera</h1>
      <p className="mt-2 max-w-xl text-[17px] text-gris">Los proyectos que mandaste aquí no aparecen ni trabajan. Puedes restaurarlos tal como estaban. A los 30 días se borran solos.</p>
      {lista.length === 0 ? (
        <p className="mt-10 text-xl font-light">La papelera está vacía.</p>
      ) : (
        <ul className="mt-10 grid gap-3 md:grid-cols-2">
          {lista.map(({ p, quedan }) => (
            <li key={p.pedido.id} className="rounded-3xl border border-linea p-6">
              <p className={etiqueta}>{PEDIDOS[p.pedido.tipo].nombre} · la mandó {p.papelera!.quien === "luna" ? "Luna" : "Jay"} {hace(p.papelera!.fecha)}</p>
              <p className="display mt-1 text-4xl leading-none">{p.pedido.cliente}</p>
              <p className={`mt-2 text-[14px] ${quedan <= 5 ? "text-[#8a1c0c]" : "text-gris"}`}>Se borra solo en {quedan} día{quedan === 1 ? "" : "s"}.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Confirmar
                  accion={accionSacarDePapelera}
                  campos={{ id: p.pedido.id }}
                  disparador="Restaurar"
                  claseDisparador="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso"
                  titulo="¿Restaurar el proyecto?"
                  texto={`«${p.pedido.cliente}» vuelve al estudio tal como estaba, con sus entregas y archivos.`}
                  confirmar="Restaurar"
                />
                <Confirmar
                  accion={accionBorrar}
                  campos={{ id: p.pedido.id }}
                  disparador="Borrar para siempre"
                  titulo="¿Borrar para siempre?"
                  texto="Se borra todo: entregas, archivos y lo que dijo el cliente. No se puede deshacer."
                  confirmar="Borrar para siempre"
                  palabra={p.pedido.cliente}
                  peligro
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
