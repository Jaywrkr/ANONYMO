import { borrarProyecto, borrarRemoto, listarPapelera, nubeActiva } from "@anonymo/pipeline";
import { PEDIDOS } from "@anonymo/agentes";
import { traerTodo } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { botonLleno, exigirEstudio, serif } from "@/lib/estudio";
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
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <p className="text-[13px] text-suave">Papelera · {lista.length}</p>
      <h1 className={`${serif} mt-1 text-[clamp(36px,4.4vw,56px)] leading-[1]`}>Lo que sacaste del estudio.</h1>
      <p className="mt-3 max-w-xl text-[15px] text-medio">Aquí no aparecen ni trabajan. Se restauran tal como estaban, con sus entregas y archivos. A los 30 días se borran solos.</p>
      {lista.length === 0 ? (
        <p className={`${serif} mt-12 text-[30px] text-suave`}>La papelera está vacía.</p>
      ) : (
        <div className="mamposteria mt-8">
          {lista.map(({ p, quedan }) => (
            <article key={p.pedido.id} className="tarjeta">
              <span className="block h-1.5 opacity-50" style={{ background: espacio(p.pedido.id).punto }} />
              <div className="p-5">
                <p className="text-[12px] text-suave">{PEDIDOS[p.pedido.tipo].nombre} · la mandó {p.papelera!.quien === "luna" ? "Luna" : "Jay"} {hace(p.papelera!.fecha)}</p>
                <p className={`${serif} mt-1 text-[28px] leading-[1.02]`}>{p.pedido.cliente}</p>
                <p className={`mt-2 text-[13px] ${quedan <= 5 ? "text-[#a3260f]" : "text-medio"}`}>Se borra solo en {quedan} día{quedan === 1 ? "" : "s"}.</p>
                <div className="mt-4 flex flex-wrap items-center gap-1">
                  <Confirmar
                    accion={accionSacarDePapelera}
                    campos={{ id: p.pedido.id }}
                    disparador="Restaurar"
                    claseDisparador={botonLleno}
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
