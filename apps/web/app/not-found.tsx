"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGENTES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { enlace, idiomaDeRuta } from "@/lib/idioma";

const PAGINAS = ["/", "/agentes", "/sala", "/proceso", "/casos", "/contacto", "/sistema", ...AGENTES.map((a) => `/agentes/${a.id}`)];

function distancia(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** La página que probablemente quería: la más parecida al enlace roto. */
function sugerencia(ruta: string) {
  const limpia = ruta.replace(/^\/en/, "").toLowerCase().replace(/\/$/, "") || "/";
  const mejor = PAGINAS.map((p) => ({ p, d: distancia(limpia, p) })).sort((x, y) => x.d - y.d)[0];
  return mejor && mejor.d <= Math.max(3, limpia.length * 0.4) ? mejor.p : undefined;
}

// Sonda busca la página con su lupa (web/17).
export default function NoEncontrado() {
  const ruta = usePathname();
  const idioma = idiomaDeRuta(ruta);
  const en = idioma === "en";
  const quizas = sugerencia(ruta);
  const NOMBRES: Record<string, [string, string]> = {
    "/": ["el inicio", "the home page"], "/agentes": ["el equipo", "the team"], "/sala": ["la sala", "the room"], "/proceso": ["el proceso", "the process"],
    "/casos": ["los casos", "our work"], "/contacto": ["contacto", "contact"], "/sistema": ["el sistema", "the system"],
  };
  const nombre = quizas?.startsWith("/agentes/") ? agentePorId(quizas.split("/")[2])?.nombre : quizas ? NOMBRES[quizas]?.[en ? 1 : 0] : undefined;
  return (
    <main className="grid min-h-[70vh] items-center gap-8 px-[max(20px,env(safe-area-inset-left))] md:grid-cols-2 md:px-10">
      <div className="buscando">
        <AgenteVista agente={agentePorId("sonda")!} className="aspect-square w-full max-w-md" />
      </div>
      <div>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">Error 404 · <span className="normal-case">{ruta}</span></p>
        <h1 className="display mt-4 text-[clamp(72px,10vw,160px)]">{en ? "Sonda can't find it." : "Sonda no la encuentra."}</h1>
        <p className="mt-4 max-w-sm text-gris">{en ? "She searched everywhere. The link may be misspelled or the page moved." : "Buscó por todas partes. Puede que el enlace esté mal escrito o que la página se haya movido."}</p>
        {quizas && (
          <p className="mt-6 text-xl font-light">
            {en ? "Did you mean " : "¿Buscabas "}
            <Link href={enlace(quizas, idioma)} className="underline underline-offset-4">{nombre ?? enlace(quizas, idioma)}</Link>?
          </p>
        )}
        <nav aria-label={en ? "Places to go" : "A dónde ir"} className="mt-8 flex flex-wrap gap-6 font-mono text-[12px] uppercase tracking-[0.14em]">
          <Link href={enlace("/", idioma)} className="underline underline-offset-4">{en ? "Home" : "Inicio"} →</Link>
          <Link href={enlace("/agentes", idioma)} className="underline underline-offset-4">{en ? "Team" : "Equipo"} →</Link>
          <Link href={enlace("/sala", idioma)} className="underline underline-offset-4">{en ? "The room" : "La sala"} →</Link>
        </nav>
      </div>
    </main>
  );
}
