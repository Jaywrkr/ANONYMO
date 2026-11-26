// Piezas de Faro (sistema/123): Faro diseña una publicación de un proyecto real, la compara con «qué es bueno» y la
// rehace hasta llegar. Jay o Luna la ven a tamaño real y la aprueban o piden un cambio.
import Link from "next/link";
import { leerFichas, listarPiezasFaro } from "@anonymo/pipeline";
import { exigirEstudio, titulo } from "@/lib/estudio";
import { proyectosParaPiezas } from "@/lib/faro";
import { PiezasFaro } from "@/components/estudio/contenido/PiezasFaro";
import { Cara } from "@/components/estudio/piezas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piezas de Faro — Estudio", robots: { index: false } };

export default async function Pagina() {
  await exigirEstudio();
  const [proyectos, piezas, { fichas }] = await Promise.all([proyectosParaPiezas(), listarPiezasFaro(), leerFichas()]);
  const refs = Object.fromEntries(Object.values(fichas).map((f) => [f.id, f.direccion?.imagenes?.length ?? 0]));
  return (
    <div className="px-5 py-7 md:px-10">
      <Link href="/estudio/contenido" className="text-[13px] text-medio">← Contenido</Link>
      <div className="mt-3 flex items-center gap-4">
        <Cara id="faro" tam={56} flota />
        <div>
          <p className="text-[13px] text-suave">Faro diseña · tú apruebas</p>
          <h1 className={titulo}>Piezas.</h1>
        </div>
      </div>
      <PiezasFaro proyectos={proyectos} inicial={piezas} referencias={refs} />
    </div>
  );
}
