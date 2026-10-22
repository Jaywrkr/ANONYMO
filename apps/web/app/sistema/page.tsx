import { AGENTES, AREAS } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";

export const metadata = { title: "Sistema — Anonymo" };
const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

const BASE = [
  ["Hueso", "#efede8", "Fondo"],
  ["Papel", "#f7f6f2", "Superficies"],
  ["Tinta", "#121214", "Texto y objetos"],
  ["Gris", "#6e6c68", "Texto secundario"],
  ["Línea", "#d6d3cb", "Divisiones"],
  ["Noche", "#0c0c0e", "Bandas oscuras"],
];

const REFERENCIAS = [
  ["Grilla de 9 óvalos con dos puntos", "El cuerpo de los agentes: degradado puro, ojos mínimos"],
  ["OFF+BRAND, Light Rails, “Protect your inner flame”", "Luz y grano dentro de la esfera"],
  ["Black Movie, Japan Week L.A., Typographic", "Base suiza: mucho blanco, titulares grandes"],
  ["SAY LESS, DOES IT FEEL REAL, uncut, WORLD CUP", "Golpes de tipografía condensada"],
  ["Hot Lunch, CW&T, Temper, Unito Station", "Los objetos de cada agente: producto mate de estudio"],
  ["Devouring Details, Interface Craft, WePresent", "Ritmo editorial y detalles de interacción"],
  ["Tensnake, Claudia Caviezel, flyers de Natural Noise", "La capa psicodélica de eventos"],
  ["Juventus, Italia 94, Mercurial", "Movimiento con peso, como una repetición de jugada"],
];

const MOVIMIENTO = [
  ["Entrada", "Sube rápido y frena seco. 0,9 s, curva expo. Nunca fade suave."],
  ["Agentes", "Respiran, parpadean cada 4–5 s y miran hacia el cursor."],
  ["Fases", "Los agentes activos pasan al frente; los demás se apagan a gris."],
  ["Respeto", "Con movimiento reducido, todo queda quieto y legible."],
];

export default function Sistema() {
  const muestra = (Object.keys(AREAS) as (keyof typeof AREAS)[]).map((k) => AGENTES.find((a) => a.area === k)!);
  return (
    <main className={`${lateral} pb-10`}>
      <h1 className="display pt-4 text-[clamp(64px,10vw,160px)]">Sistema</h1>
      <p className="mt-4 max-w-xl text-gris">Dirección de arte de la fase 1, armada con lo que guardas en tu MyMind. Base calma, golpes de tipografía y el color solo en los agentes.</p>

      <section className="mt-20">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Color base</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BASE.map(([n, hex, uso]) => (
            <li key={n} className="rounded-2xl border border-linea p-3">
              <span className="block h-20 rounded-xl" style={{ background: hex }} />
              <span className="mt-3 block">{n}</span>
              <span className="block font-mono text-[11px] text-gris">{hex} · {uso}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Áreas · el color vive en los agentes</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {muestra.map((a) => {
            const ar = AREAS[a.area];
            return (
              <li key={ar.id}>
                <AgenteVista agente={a} conProp={false} className="aspect-square w-full" distancia={4.6} />
                <span className="mt-1 block border-t border-linea pt-2">{ar.nombre}</span>
                <span className="block font-mono text-[11px] text-gris">{ar.luz} · {ar.medio} · {ar.sombra}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-20 grid gap-10 md:grid-cols-3">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Display · Big Shoulders</h2>
          <p className="display mt-4 text-8xl">Aa 1994</p>
          <p className="mt-2 text-sm text-gris">Condensada, en peso ligero: grita por tamaño, no por grosor.</p>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Texto · Geist</h2>
          <p className="mt-4 text-5xl font-light tracking-tight">Aa Bb Cc</p>
          <p className="mt-2 text-sm text-gris">Lecturas largas y titulares de párrafo, en ligero.</p>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Detalle · Geist Mono</h2>
          <p className="mt-4 font-mono text-3xl uppercase tracking-[0.12em]">2°54′S</p>
          <p className="mt-2 text-sm text-gris">Etiquetas, datos y coordenadas. Siempre en mayúscula con aire.</p>
        </div>
      </section>

      <section className="mt-20 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Movimiento</h2>
          <dl className="mt-4 border-t border-tinta">
            {MOVIMIENTO.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-4 border-b border-linea py-3">
                <dt>{k}</dt>
                <dd className="text-gris">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Referencias de tu MyMind</h2>
          <dl className="mt-4 border-t border-tinta">
            {REFERENCIAS.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-linea py-3 sm:grid-cols-[1fr_1fr] sm:gap-4">
                <dt>{k}</dt>
                <dd className="text-gris">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
