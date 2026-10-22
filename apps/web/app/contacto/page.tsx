import { Formulario } from "./Formulario";

export const metadata = { title: "Contacto — Anonymo" };

export default function Contacto() {
  return (
    <main className="px-[max(20px,env(safe-area-inset-left))] md:px-10">
      <div className="grid gap-6 pb-14 pt-4 md:grid-cols-12 md:items-end">
        <h1 className="display text-[clamp(80px,13vw,210px)] md:col-span-8">Hablemos</h1>
        <p className="max-w-sm text-gris md:col-span-4">Cuéntanos qué necesitas. Atlas arma el plan esa misma noche y Jay o Luna te responden.</p>
      </div>
      <Formulario />
    </main>
  );
}
