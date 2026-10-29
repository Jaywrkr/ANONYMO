// Cómo trabaja el equipo (sistema/36): tres tarjetas para elegir. Va dentro de un formulario (campo «modo»).
import type { ModoTrabajo } from "@anonymo/pipeline";

export const MODOS: { id: ModoTrabajo; nombre: string; ayuda: string; recomendado?: boolean }[] = [
  { id: "paso", nombre: "Un agente a la vez", ayuda: "Trabaja uno, entrega y espera tu revisión. Apruebas y sigue el siguiente. Siempre sabes qué pasó.", recomendado: true },
  { id: "fase", nombre: "Por fases", ayuda: "Trabajan todos los de una fase y te piden revisar al cerrarla (donde propone Atlas)." },
  { id: "auto", nombre: "Automático", ayuda: "Sigue solo hasta el final. Solo se detiene si algo falla o si el Jurado no aprueba." },
];

export function OpcionesModo({ actual = "paso", oscuro = false }: { actual?: ModoTrabajo; oscuro?: boolean }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-3">
      <legend className="sr-only">Cómo trabaja el equipo</legend>
      {MODOS.map((m) => (
        <label key={m.id} className={`relative grid cursor-pointer content-start gap-1 rounded-[14px] p-3.5 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-urgente ${oscuro ? "bg-white/5 hover:bg-white/10 has-[:checked]:bg-white has-[:checked]:text-tinta" : "bg-[#f6f3ee] hover:bg-[#efeae2] has-[:checked]:bg-tinta has-[:checked]:text-white"}`}>
          <input type="radio" name="modo" value={m.id} defaultChecked={m.id === actual} className="sr-only" />
          <span className="flex items-center gap-2 text-[14px] font-medium">
            {m.nombre}
            {m.recomendado && <span className="ml-auto rounded-full bg-urgente/90 px-2 py-0.5 text-[10px] font-normal text-white">sugerido</span>}
          </span>
          <span className="text-[12px] leading-snug opacity-75">{m.ayuda}</span>
        </label>
      ))}
    </fieldset>
  );
}
