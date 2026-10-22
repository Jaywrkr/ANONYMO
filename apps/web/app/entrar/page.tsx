import { notFound, redirect } from "next/navigation";
import { estudioActivo, quienEsta } from "@/lib/estudio";
import { Formulario } from "./Formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar — Estudio", robots: { index: false, follow: false } };

// La puerta del estudio en línea: solo Jay y Luna.
export default async function Entrar({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  if (!estudioActivo()) notFound();
  if (await quienEsta()) redirect("/estudio");
  const { a } = await searchParams;
  return (
    <main className="px-[max(20px,env(safe-area-inset-left))] pb-24 pt-10 md:px-10">
      <h1 className="display text-[clamp(56px,9vw,140px)]">Estudio</h1>
      <p className="mt-2 max-w-md text-[17px] text-gris">El panel de Jay y Luna. Entra con tu clave.</p>
      <Formulario a={a} />
    </main>
  );
}
