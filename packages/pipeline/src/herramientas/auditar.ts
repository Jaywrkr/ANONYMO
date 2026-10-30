// Prisma: Lighthouse (celular y escritorio) y axe sobre una web. Usa el Chromium de Playwright.

export interface Auditoria {
  url: string;
  celular: Puntajes;
  escritorio: Puntajes;
  axe: { id: string; impacto: string | null | undefined; nodos: number; ayuda: string }[];
  arreglos: string[];
}
export interface Puntajes { rendimiento: number; accesibilidad: number; practicas: number; seo: number }

export async function auditar(url: string): Promise<Auditoria> {
  const { navegadorCalidad } = await import("../inspeccionar.ts");
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const { default: lighthouse } = await import("lighthouse");
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const browser = await navegadorCalidad(puerto);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    const axe = await new AxeBuilder({ page: page as never }).disableRules(["region"]).analyze();
    await page.close();
    // Se conserva el contexto hasta cerrar el navegador: Chromium de servidor
    // puede terminar el proceso al cerrar el último contexto aislado.

    const correr = async (celular: boolean) => {
      const r = await lighthouse(url, {
        port: puerto,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: celular ? "mobile" : "desktop",
        screenEmulation: celular
          ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
          : { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
      });
      if (!r) throw new Error("Lighthouse no devolvió resultado.");
      if(r.lhr.runtimeError) throw new Error(`Lighthouse no pudo medir: ${r.lhr.runtimeError.message}`);
      if(["performance","accessibility","best-practices","seo"].some(k=>r.lhr.categories[k]?.score == null)) throw new Error(`Lighthouse devolvió mediciones incompletas: ${r.lhr.runWarnings?.join(" · ") ?? "sin detalle"}`);
      return r.lhr;
    };
    const cel = await correr(true);
    const esc = await correr(false);
    const puntos = (l: typeof cel): Puntajes => {
      const n = (k: string) => Math.round((l.categories[k]?.score ?? 0) * 100);
      return { rendimiento: n("performance"), accesibilidad: n("accessibility"), practicas: n("best-practices"), seo: n("seo") };
    };
    // Primero lo que falla en accesibilidad, SEO y prácticas; después rendimiento, de peor a mejor.
    const categoria = (id: string) =>
      (["accessibility", "seo", "best-practices"] as const).find((k) => cel.categories[k]?.auditRefs.some((r) => r.id === id && r.weight > 0));
    const fallas = Object.values(cel.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "manual");
    const texto = (a: (typeof fallas)[number]) => `${a.title}${a.displayValue ? ` (${a.displayValue})` : ""}`;
    const arreglos = [
      ...fallas.filter((a) => categoria(a.id)).map((a) => `${texto(a)} [${categoria(a.id)}]`),
      ...fallas.filter((a) => !categoria(a.id)).sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).map(texto),
    ].slice(0, 10);
    return {
      url,
      celular: puntos(cel),
      escritorio: puntos(esc),
      axe: axe.violations.map((v) => ({ id: v.id, impacto: v.impact, nodos: v.nodes.length, ayuda: v.help })),
      arreglos,
    };
  } finally {
    await browser.close();
  }
}

export function resumenAuditoria(a: Auditoria): string {
  const fila = (n: string, p: Puntajes) => `| ${n} | ${p.rendimiento} | ${p.accesibilidad} | ${p.practicas} | ${p.seo} |`;
  return [
    `Auditoría de ${a.url}`,
    "",
    "| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |",
    "|---|---|---|---|---|",
    fila("Celular", a.celular),
    fila("Escritorio", a.escritorio),
    "",
    a.axe.length ? `Errores de accesibilidad (axe): ${a.axe.map((v) => `${v.ayuda} [${v.impacto}, ${v.nodos}]`).join("; ")}` : "Accesibilidad (axe): sin errores.",
    "",
    a.arreglos.length ? "Arreglos por prioridad (celular):\n" + a.arreglos.map((x) => `- ${x}`).join("\n") : "Sin arreglos pendientes en celular.",
  ].join("\n");
}
