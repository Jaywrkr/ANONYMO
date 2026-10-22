import { Indice } from "./Indice";

export const metadata = { title: "Equipo — Anonymo" };

export default function Agentes() {
  return (
    <main className="px-[max(20px,env(safe-area-inset-left))] md:px-10">
      <div className="grid gap-6 pb-12 pt-4 md:grid-cols-12 md:items-end">
        <h1 className="display text-[clamp(80px,13vw,210px)] md:col-span-8">22 agentes</h1>
        <p className="max-w-sm text-gris md:col-span-4">
          Cada uno toma lo mejor de los mejores del mundo en su oficio. Trabajan por fases, de noche si hace falta, y nada sale sin que Jay y Luna lo aprueben.
        </p>
      </div>
      <Indice />
    </main>
  );
}
