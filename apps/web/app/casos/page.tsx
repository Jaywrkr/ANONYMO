import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";

export const metadata = { title: "Casos — Anonymo" };
const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

export default function Casos() {
  const lumen = agentePorId("lumen")!;
  return (
    <main className={lateral}>
      <div className="grid gap-6 pb-16 pt-4 md:grid-cols-12 md:items-end">
        <h1 className="display text-[clamp(80px,13vw,210px)] md:col-span-8">Casos</h1>
        <p className="max-w-sm text-gris md:col-span-4">El primer caso somos nosotros: esta web se hace con el mismo proceso que usamos con cada cliente, a la vista de todos.</p>
      </div>

      <article className="grid gap-8 border-t border-tinta py-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Caso 01 · En curso</p>
          <h2 className="display mt-4 text-[clamp(72px,9vw,150px)]">Anonymo</h2>
          <p className="mt-4 max-w-[46ch] text-xl font-light leading-snug tracking-tight">
            Nuestra propia agencia: nombre, identidad y una web hecha para competir en Awwwards. Va por la fase 4.
          </p>
          <dl className="mt-10 grid max-w-xl grid-cols-[120px_1fr] gap-x-6 gap-y-3 border-t border-linea pt-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">Fases</dt><dd>01 Arranque → 04 Web</dd>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">Equipo</dt><dd>Atlas, Nova, Sonda, Verba, Orla, Lumen, Vector, Kine</dd>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">Meta</dt><dd>Site of the Day en diciembre de 2026</dd>
          </dl>
          <Link href="/sala" className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4">Verlo en la sala →</Link>
        </div>
        <AgenteVista agente={lumen} className="aspect-square w-full md:col-span-5" distancia={5.2} />
      </article>

      <section className="grid gap-3 border-t border-tinta py-12 md:grid-cols-3">
        {["02", "03", "04"].map((n) => (
          <Link key={n} href="/contacto" className="group flex aspect-[4/5] flex-col justify-between rounded-3xl border border-dashed border-linea p-6 transition-colors hover:border-tinta">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Caso {n}</span>
            <span className="display text-6xl text-linea transition-colors group-hover:text-tinta">Tu proyecto aquí</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
