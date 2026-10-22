import { Formulario } from "@/app/contacto/Formulario";
import type { Idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";

export function Contacto({ idioma }: { idioma: Idioma }) {
  const t = T[idioma].contacto;
  return (
    <main className="px-[max(20px,env(safe-area-inset-left))] md:px-10">
      <div className="grid gap-6 pb-14 pt-4 md:grid-cols-12 md:items-end">
        <h1 className="display text-[clamp(80px,13vw,210px)] md:col-span-8">{t.titulo}</h1>
        <p className="max-w-sm text-gris md:col-span-4">{t.texto}</p>
      </div>
      <Formulario />
    </main>
  );
}
