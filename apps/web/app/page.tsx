import { AGENTES, FASES } from "@anonymo/agentes";

export default function Inicio() {
  return (
    <main className="min-h-dvh px-6 py-10 md:px-12">
      <p className="font-mono text-xs uppercase tracking-widest text-gris">Fase 0 · base</p>
      <h1 className="mt-6 font-display text-[18vw] font-light uppercase leading-[0.82] md:text-[12vw]">Anonymo</h1>
      <p className="mt-6 max-w-md text-gris">
        {AGENTES.length} agentes, {FASES.length} fases. La dirección de arte llega en la fase 1.
      </p>
    </main>
  );
}
