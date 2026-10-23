import Link from "next/link";
import { PEDIDOS } from "@anonymo/agentes";
import { PLANTILLAS } from "@anonymo/pipeline";
import { boton, botonLleno, campo, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { accionNuevoProyecto } from "../acciones";
import { Enviar } from "./Enviar";

export const dynamic = "force-dynamic";
// Con "empezar", Atlas y la primera fase trabajan aquí mismo: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Nuevo proyecto — Estudio", robots: { index: false } };

const TIPO_AYUDA: Record<string, string> = {
  web: "Arranque → Web → Jurado",
  marca: "Arranque → Naming → Identidad",
  lanzamiento: "Arranque → Lanzamiento → Jurado",
  todo: "Las 7 fases",
};

// Jay o Luna cargan el pedido después de hablar con el cliente. Mientras más contexto, mejor trabajan los agentes.
export default async function NuevoProyecto({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const yo = await exigirEstudio();
  const { error } = await searchParams;
  const conIA = !!process.env.ANTHROPIC_API_KEY;
  const caja = "grid gap-2";
  return (
    <main className={`${lateral} pb-20`}>
      <p className="pt-4"><Link href="/estudio" className={etiqueta}>← Estudio</Link></p>
      <h1 className="display mt-2 text-[clamp(56px,9vw,140px)]">Nuevo proyecto</h1>
      <p className="max-w-xl text-[17px] text-gris">Ya hablaste con el cliente. Cuéntale a Atlas todo lo que sabes: él arma el plan y reparte el trabajo.</p>
      {error && <p role="alert" className="mt-6 max-w-2xl rounded-2xl bg-[#fde8e4] p-4 text-[#8a1c0c]">{error}</p>}

      <form action={accionNuevoProyecto} className="mt-10 grid max-w-2xl gap-8">
        <label className={caja}>
          <span className={etiqueta}>Cliente</span>
          <input name="cliente" required maxLength={80} placeholder="Clínica Sonrisa, Gabriela Andrade…" className={campo} />
        </label>

        <fieldset className={caja}>
          <legend className={etiqueta}>Qué quiere</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(PEDIDOS).map(([k, v], i) => (
              <label key={k} className="flex cursor-pointer flex-col rounded-2xl border border-linea p-4 has-[:checked]:border-tinta has-[:checked]:bg-papel">
                <span className="flex items-center gap-2 text-[17px]"><input type="radio" name="tipo" value={k} defaultChecked={i === 0} required /> {v.nombre}</span>
                <span className="mt-1 text-[13px] text-gris">{TIPO_AYUDA[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={caja}>
          <span className={etiqueta}>Lo que hablaron</span>
          <textarea
            name="descripcion"
            required
            minLength={20}
            rows={9}
            className={campo}
            placeholder={"Quién es y qué hace. Qué quiere lograr y para cuándo. Lo que le gusta y lo que no (\"nada de azul\", \"más elegante\"). Competencia, referencias, presupuesto, lo que ya tiene. Cuanto más, mejor."}
          />
          <span className="text-[13px] text-gris">Todos los agentes leen esto en cada entrega.</span>
        </label>

        <details className="rounded-2xl border border-linea p-4">
          <summary className={`${etiqueta} cursor-pointer`}>Datos sueltos (opcional)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ["correo", "Correo del cliente", "para el portal y los avisos"],
              ["rubro", "Rubro", "odontología estética"],
              ["ciudad", "Ciudad", "Cuenca"],
              ["publico", "Público", "parejas 30–50, nivel alto"],
              ["plazo", "Plazo", "antes de diciembre"],
              ["presupuesto", "Presupuesto", "USD 1.500–2.500"],
              ["url", "Web actual", "https://…"],
            ].map(([n, t, ph]) => (
              <label key={n} className={caja}>
                <span className={etiqueta}>{t}</span>
                <input name={n} placeholder={ph} className={campo} type={n === "correo" ? "email" : n === "url" ? "url" : "text"} />
              </label>
            ))}
            <label className={caja}>
              <span className={etiqueta}>¿Ya tiene marca?</span>
              <select name="marca" className={campo} defaultValue="">
                <option value="">No sé</option>
                <option value="si">Sí, tiene logo y colores</option>
                <option value="no">No, hay que hacerla</option>
              </select>
            </label>
            <label className={`${caja} sm:col-span-2`}>
              <span className={etiqueta}>Referencias (una por línea)</span>
              <textarea name="referencias" rows={3} placeholder={"https://…\n@cuenta de Instagram"} className={campo} />
            </label>
          </div>
        </details>

        <label className={caja}>
          <span className={etiqueta}>Archivos del cliente (opcional)</span>
          <input type="file" name="archivos" multiple accept="image/*,.pdf,.svg,.ai,.eps,.zip,.txt,.md,.docx" className="text-[15px]" />
          <span className="text-[13px] text-gris">Logo, fotos, brief, capturas de WhatsApp. En línea: hasta 4 MB en total por envío (lo más pesado, súbelo después desde el proyecto).</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={caja}>
            <span className={etiqueta}>Plantilla</span>
            <select name="plantilla" className={campo} defaultValue="">
              <option value="">Ninguna</option>
              {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className={caja}>
            <span className={etiqueta}>Idioma</span>
            <select name="idioma" className={campo} defaultValue="es">
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </label>
          <label className={caja}>
            <span className={etiqueta}>Se detiene</span>
            <select name="pausas" className={campo} defaultValue="clave">
              <option value="clave">Donde Atlas diga</option>
              <option value="cada-fase">En cada fase</option>
              <option value="nunca">Solo al final</option>
            </select>
          </label>
        </div>

        <fieldset className="grid gap-3 rounded-2xl bg-papel p-5">
          <legend className="sr-only">Cuándo empiezan</legend>
          <label className="flex items-start gap-3 text-[16px]">
            <input type="radio" name="empezar" value="1" defaultChecked className="mt-1" />
            <span><strong>Que empiecen ya.</strong> <span className="text-gris">El equipo trabaja hasta la primera pausa{conIA ? " (puede tardar unos minutos)" : ""}.</span></span>
          </label>
          <label className="flex items-start gap-3 text-[16px]">
            <input type="radio" name="empezar" value="0" className="mt-1" />
            <span><strong>Solo el plan.</strong> <span className="text-gris">Revisas el plan y las preguntas de Atlas, y les das «Seguir» cuando quieras.</span></span>
          </label>
          {conIA && (
            <label className="flex items-center gap-3 border-t border-linea pt-3 text-[14px] text-gris">
              <input type="checkbox" name="motor" value="simulado" /> Prueba sin IA (gratis: solo estructura, sin gastar créditos)
            </label>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Enviar className={botonLleno} />
          <Link href="/estudio" className={boton}>Cancelar</Link>
          <span className="text-[13px] text-gris">Queda a nombre de {yo === "luna" ? "Luna" : "Jay"}.</span>
        </div>
      </form>
    </main>
  );
}
