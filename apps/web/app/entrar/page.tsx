import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { notFound, redirect } from "next/navigation";
import { estudioActivo, quienEsta } from "@/lib/estudio";
import { MARCO_TODO } from "@/lib/espacio";
import { Cara } from "@/components/estudio/piezas";
import { Formulario } from "./Formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar — Estudio", robots: { index: false, follow: false } };

// La puerta del estudio en línea: solo Jay y Luna.
export default async function Entrar({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  if (!estudioActivo()) notFound();
  if (await quienEsta()) redirect("/estudio");
  const { a } = await searchParams;
  return (
    <div className="estudio-marco grid min-h-dvh place-items-center p-2" style={{ background: MARCO_TODO }}>
      <main className="w-full max-w-[440px] rounded-[22px] bg-carta p-7 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_30px_80px_-30px_rgba(60,40,20,.35)] sm:p-9">
        <div className="flex items-center justify-between">
          <span className="font-display text-[24px] uppercase leading-none">Anonymo*</span>
          <span className="flex">
            <Cara id="atlas" tam={30} flota titulo={false} />
            <Cara id="ledger" tam={30} titulo={false} className="-ml-2" />
          </span>
        </div>
        <h1 className="mt-8 font-serif text-[44px] leading-[1]">Hola de nuevo.</h1>
        <p className="mt-2 text-[15px] text-medio">El estudio de Jay y Luna. Entra con tu clave.</p>
        <Formulario a={a} />
      </main>
    </div>
  );
}
