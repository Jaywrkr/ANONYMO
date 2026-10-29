// Revisar UNA entrega (sistema/36, modo paso a paso): aprobar y que siga el siguiente, pedir un cambio o rehacer.
// Lo usan el panel «Ahora» del proyecto y la página de la entrega.
import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { contratoPorId, leerEntrega, type Proyecto, type TareaId } from "@anonymo/pipeline";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { accionAprobar, accionCambiar } from "@/app/estudio/acciones";
import { siguienteTarea } from "@/lib/camino";
import { segundosEstimados } from "@/lib/duracion";
import { Cara } from "./piezas";
import { Confirmar } from "./Confirmar";

export function RevisarAgente({ p, t, mio, oscuro = false, verEntrega = true }: { p: Proyecto; t: TareaId; mio: boolean; oscuro?: boolean; verEntrega?: boolean }) {
  const id = p.pedido.id;
  const c = contratoPorId(t)!;
  const a = agentePorId(c.agente)!;
  const e = leerEntrega(id, t);
  const sig = siguienteTarea(p) as TareaId | undefined;
  const cs = sig ? contratoPorId(sig) : undefined;
  const minutos = sig ? Math.max(1, Math.round(segundosEstimados(sig) / 60)) : 0;
  const comunes = <><input type="hidden" name="id" value={id} /><input type="hidden" name="motor" value="" />{!mio && <input type="hidden" name="forzar" value="1" />}</>;
  const tenue = oscuro ? "text-white/65" : "text-medio";
  const linea = oscuro ? "border-white/10" : "border-borde";
  const campo = `w-full rounded-xl px-3 py-2.5 text-[14px] outline-none ${oscuro ? "bg-white/10 text-white placeholder:text-white/40 focus:bg-white/15" : "bg-[#f6f3ee] focus:bg-white focus:shadow-[0_0_0_1.5px_#1a1816]"}`;
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <Cara id={a.id} tam={44} titulo={false} flota />
        <div className="min-w-0">
          <p className={`text-[13px] ${tenue}`}>{a.nombre} · {a.rol} · versión {e?.version ?? 1}</p>
          {e?.dice && <p className="mt-1 font-serif text-[22px] leading-[1.15]">“{e.dice}”</p>}
          {e?.necesita && e.necesita !== "—" && <p className={`mt-1 text-[13px] ${tenue}`}><span className="font-medium">Necesita:</span> {e.necesita}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {verEntrega && (
          <Link href={`/estudio/${id}/${t.replace(".", "-")}`} className={`inline-flex min-h-12 items-center rounded-full px-6 text-[14px] font-medium transition ${oscuro ? "bg-white/10 text-white hover:bg-white/15" : "bg-[#f1ede6] hover:bg-[#e9e3d9]"}`}>
            Leer la entrega →
          </Link>
        )}
        <form action={accionAprobar}>
          {comunes}
          <Enviar className={`inline-flex min-h-12 items-center rounded-full px-7 text-[14px] font-medium transition ${oscuro ? "bg-white text-tinta hover:bg-[#f1ede6]" : "bg-tinta text-white hover:bg-black"}`}
            texto={mio ? (sig ? "Aprobar y seguir" : "Aprobar y cerrar") : "Aprobar igual"} trabajando="Aprobando…" proyecto={id} />
        </form>
        <Confirmar
          accion={accionCambiar}
          campos={{ id, motor: "", agente: a.id, nota: "Rehazla desde cero con otro enfoque: la versión anterior no sirve.", ...(mio ? {} : { forzar: "1" }) }}
          disparador="Rehacer"
          claseDisparador={`inline-flex min-h-12 items-center rounded-full px-4 text-[14px] transition ${oscuro ? "text-white/80 hover:text-white" : "text-medio hover:text-tinta"}`}
          titulo={`¿Que ${a.nombre} la rehaga desde cero?`}
          texto="La versión actual queda en el historial. Si quieres algo puntual, mejor usa «Pedir un cambio»."
          confirmar="Rehacer"
        />
      </div>
      <details className={`group border-t pt-3 ${linea}`}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-[14px] font-medium">Pedir un cambio a {a.nombre} <span className={`ml-auto transition group-open:rotate-45 ${tenue}`}>+</span></summary>
        <form action={accionCambiar} className="mt-2 grid gap-2">
          {comunes}
          <input type="hidden" name="agente" value={a.id} />
          <label className="sr-only" htmlFor={`cambio-${t}`}>Qué cambiar</label>
          <textarea id={`cambio-${t}`} name="nota" rows={3} required placeholder="Qué cambiar, en tus palabras: «más cálido», «quita la sección de precios»…" className={campo} />
          <div><Enviar className={`inline-flex min-h-11 items-center rounded-full px-6 text-[14px] font-medium ${oscuro ? "bg-white text-tinta" : "bg-tinta text-white"}`} texto="Pedir el cambio" trabajando="Enviando…" proyecto={id} /></div>
        </form>
      </details>
      <p className={`text-[13px] ${tenue}`}>
        {cs ? <>Después sigue <span className="font-medium">{agentePorId(cs.agente)?.nombre}</span> con {cs.entrega.toLowerCase()} · suele tardar unos {minutos} min.</> : "Es la última entrega del plan."}
      </p>
    </div>
  );
}
