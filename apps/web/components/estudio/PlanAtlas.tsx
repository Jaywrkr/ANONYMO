// El plan que armó Atlas, antes de que nadie trabaje: quién entra, quién no y por qué, y cuánto costaría.
import { agentePorId, AREAS, FASES } from "@anonymo/agentes";
import { contratoPorId, costoPlan, type Proyecto } from "@anonymo/pipeline";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { accionEmpezar, accionReplanear } from "@/app/estudio/acciones";
import { boton, botonLleno, campo, etiqueta } from "@/lib/estudio";

export function PlanAtlas({ p, conIA }: { p: Proyecto; conIA: boolean }) {
  const id = p.pedido.id;
  const fuera = FASES.filter((f) => !p.plan.fases.includes(f.n) && f.n !== 7);
  const costo = costoPlan(p.pedido, p.plan);
  return (
    <section aria-label="Plan de Atlas" className="mt-8 max-w-5xl rounded-3xl border border-tinta p-6 md:p-8">
      <p className={etiqueta}>Plan de Atlas{p.plan.porIA ? "" : " · con reglas (sin IA)"} · nadie trabaja todavía</p>
      {p.plan.resumen && <p className="display mt-2 text-[clamp(32px,4vw,52px)] leading-none">{p.plan.resumen}</p>}

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <p className={etiqueta}>Trabajan · {p.plan.tareas.length}</p>
          {p.plan.fases.map((f) => (
            <div key={f} className="mt-4">
              <p className="text-[15px] font-medium">{FASES.find((x) => x.n === f)?.nombre}</p>
              <p className="text-[14px] text-gris">{p.plan.razones[f]}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {p.plan.tareas.filter((t) => t.startsWith(`${f}.`)).map((t) => {
                  const c = contratoPorId(t)!;
                  const a = agentePorId(c.agente)!;
                  return (
                    <li key={t} className="inline-flex items-center gap-2 rounded-full bg-papel px-3 py-1 text-[14px]">
                      <i aria-hidden className="block h-2.5 w-2.5 rounded-full" style={{ background: AREAS[a.area].medio }} />
                      {a.nombre} · {c.entrega}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <p className={etiqueta}>No trabajan</p>
          <ul className="mt-3 grid gap-2 text-[14px]">
            {p.plan.quitadas.map((q) => (
              <li key={q.id}><span className="font-medium">{agentePorId(contratoPorId(q.id)?.agente ?? "")?.nombre}</span> <span className="text-gris">· {q.razon}</span></li>
            ))}
            {fuera.length > 0 && <li className="text-gris">Fases que no entran: {fuera.map((f) => f.nombre).join(", ")}.</li>}
          </ul>
          {p.plan.preguntas.length > 0 && (
            <>
              <p className={`${etiqueta} mt-6`}>Lo que falta saber del cliente</p>
              <ul className="mt-2 grid gap-1 text-[14px]">{p.plan.preguntas.map((q) => <li key={q}>· {q}</li>)}</ul>
            </>
          )}
          <p className="mt-6 text-[14px] text-gris">Costo aproximado con IA: <span className="text-tinta">≈ US$ {costo.toFixed(2)}</span> (sin contar cambios).</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 border-t border-linea pt-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <form action={accionEmpezar} className="grid gap-2">
          <input type="hidden" name="id" value={id} />
          <Enviar className={botonLleno} texto="Que empiecen" trabajando="El equipo está trabajando… no cierres esta página" />
          {conIA && (
            <label className="flex items-center gap-2 text-[13px] text-gris">
              <input type="checkbox" name="motor" value="simulado" /> Prueba sin gastar (solo estructura)
            </label>
          )}
        </form>
        <form action={accionReplanear} className="grid gap-2">
          <input type="hidden" name="id" value={id} />
          <textarea name="ajuste" rows={2} required className={campo} placeholder="¿Algo no cuadra? Dile a Atlas: «sin video», «sí necesita nombre», «que Lente haga la sesión de fotos»…" />
          <div><Enviar className={boton} texto="Ajustar plan" trabajando="Atlas está ajustando…" /></div>
        </form>
      </div>
    </section>
  );
}
