"use client";

import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";

export default function NoEncontrado() {
  return (
    <main className="grid min-h-[70vh] items-center gap-8 px-[max(20px,env(safe-area-inset-left))] md:grid-cols-2 md:px-10">
      <AgenteVista agente={agentePorId("sonda")!} className="aspect-square w-full max-w-md" />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Error 404</p>
        <h1 className="display mt-4 text-[clamp(72px,10vw,160px)]">Sonda no la encuentra.</h1>
        <p className="mt-4 max-w-sm text-gris">Esta página no existe. Puede que el enlace esté mal escrito.</p>
        <Link href="/" className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4">Volver al inicio →</Link>
      </div>
    </main>
  );
}
