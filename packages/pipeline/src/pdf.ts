// Un PDF limpio para el cliente: portada, índice y las entregas listas, con la tipografía de la agencia.
import { versionCliente } from "./privado.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { agentePorId, AREAS, FASES } from "@anonymo/agentes";
import { leerEntrega, leerProyecto, RAIZ } from "./almacen.ts";
import { contratoPorId } from "./contratos.ts";
import type { TareaId } from "./tipos.ts";

const fuente = (ruta: string) => {
  const r = join(RAIZ, "node_modules", ruta);
  return existsSync(r) ? `url(data:font/woff2;base64,${readFileSync(r).toString("base64")})` : "local(Arial)";
};

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function htmlDelProyecto(id: string, opciones: { internas?: boolean } = {}): string {
  const p = leerProyecto(id);
  const tareas = p.plan.tareas.filter((t) => p.tareas[t] === "lista" && (opciones.internas || !contratoPorId(t)?.interna)) as TareaId[];
  const en = p.pedido.idioma === "en";
  const fecha = new Date().toLocaleDateString(en ? "en-US" : "es-EC", { day: "numeric", month: "long", year: "numeric" });
  const secciones = tareas
    .map((t, i) => {
      const e = leerEntrega(id, t)!;
      const a = agentePorId(e.agente)!;
      const ar = AREAS[a.area];
      const fase = FASES.find((f) => f.n === Number(t.split(".")[0]))!;
      const texto = opciones.internas ? e.contenido : versionCliente(e.contenido);
      const cuerpo = marked.parse(texto.replace(/^# .*\n+/, ""), { gfm: true, async: false }) as string;
      return `<section class="entrega" id="e${i}">
        <p class="meta">${String(fase.n).padStart(2, "0")} · ${esc(fase.nombre)} · ${esc(a.nombre)}, ${esc(a.rol.toLowerCase())}</p>
        <h2><i style="background:radial-gradient(circle at 35% 28%, ${ar.luz}, ${ar.medio} 48%, ${ar.sombra})"></i>${esc(e.titulo)}</h2>
        <p class="dice">“${esc(e.dice)}”</p>
        ${cuerpo}
      </section>`;
    })
    .join("\n");
  const indice = tareas
    .map((t, i) => {
      const e = leerEntrega(id, t)!;
      return `<li><a href="#e${i}"><span>${esc(agentePorId(e.agente)!.nombre)}</span> ${esc(e.titulo)}</a></li>`;
    })
    .join("");

  return `<!doctype html><html lang="${en ? "en" : "es"}"><head><meta charset="utf-8"><title>${esc(p.pedido.cliente)}</title><style>
  @font-face { font-family: Display; src: ${fuente("@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2")}; font-weight: 100 900; }
  @font-face { font-family: Sans; src: ${fuente("geist/dist/fonts/geist-sans/Geist-Regular.woff2")}; font-weight: 400; }
  @font-face { font-family: Sans; src: ${fuente("geist/dist/fonts/geist-sans/Geist-Light.woff2")}; font-weight: 300; }
  @font-face { font-family: Mono; src: ${fuente("geist/dist/fonts/geist-mono/GeistMono-Regular.woff2")}; }
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Sans, Arial, sans-serif; color: #121214; font-size: 10.5pt; line-height: 1.55; margin: 0; }
  .portada { height: 255mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
  .portada h1 { font-family: Display; font-weight: 340; text-transform: uppercase; font-size: 78pt; line-height: .9; margin: 0; }
  .meta, .portada .meta { font-family: Mono; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .14em; color: #55534e; }
  .portada p.desc { font-size: 15pt; font-weight: 300; max-width: 120mm; }
  .indice { page-break-after: always; }
  .indice h2, .entrega h2 { font-family: Display; font-weight: 340; text-transform: uppercase; font-size: 30pt; line-height: .95; margin: 2mm 0 4mm; }
  .indice ol { padding-left: 0; list-style: none; columns: 2; }
  .indice li { padding: 1.5mm 0; border-bottom: .3pt solid #d6d3cb; break-inside: avoid; }
  .indice a { color: inherit; text-decoration: none; } .indice span { display: inline-block; width: 22mm; font-weight: 400; color: #55534e; }
  .entrega { page-break-before: always; }
  .entrega h2 i { display: inline-block; width: 7mm; height: 7mm; border-radius: 50%; margin-right: 3mm; vertical-align: -1mm; }
  .dice { font-size: 13pt; font-weight: 300; margin: 0 0 6mm; }
  h3 { font-size: 11pt; margin: 5mm 0 1mm; } h2 + h2 { margin-top: 0; }
  .entrega h2:not(:first-of-type) { font-size: 17pt; margin-top: 7mm; page-break-before: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 3mm 0; page-break-inside: avoid; }
  th { font-family: Mono; font-size: 7pt; text-transform: uppercase; letter-spacing: .1em; color: #55534e; font-weight: 400; text-align: left; }
  th, td { border-bottom: .3pt solid #d6d3cb; padding: 1.5mm 2mm 1.5mm 0; vertical-align: top; }
  blockquote { border-left: 1pt solid #121214; margin: 3mm 0; padding-left: 4mm; color: #55534e; }
  code { font-family: Mono; font-size: 8.5pt; } pre { white-space: pre-wrap; background: #f7f6f2; padding: 3mm; border-radius: 2mm; }
  a { color: inherit; }
</style></head><body>
  <section class="portada">
    <p class="meta">Anonymo · Jay ${en ? "&amp;" : "y"} Luna · ${esc(fecha)}</p>
    <div><h1>${esc(p.pedido.cliente)}</h1><p class="desc">${esc(p.pedido.descripcion)}</p></div>
    <p class="meta">${tareas.length} ${en ? "deliverables · phases" : "entregas · fases"} ${p.plan.fases.join(" · ")}</p>
  </section>
  <section class="indice"><h2>${en ? "Contents" : "Contenido"}</h2><ol>${indice}</ol></section>
  ${secciones}
</body></html>`;
}

/** Genera el PDF con el Chromium de Playwright. */
export async function exportarPdf(id: string, opciones: { internas?: boolean } = {}): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const b = await chromium.launch();
  try {
    const page = await b.newPage();
    await page.setContent(htmlDelProyecto(id, opciones), { waitUntil: "load" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="font-family:monospace;font-size:7px;color:#55534e;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(leerProyecto(id).pedido.cliente)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });
  } finally {
    await b.close();
  }
}
