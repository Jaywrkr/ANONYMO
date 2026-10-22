import { marked } from "marked";

/** Markdown de una entrega a HTML, sin el título (ya se muestra arriba). Contenido propio del equipo, no de terceros. */
export const html = (md: string) => marked.parse(md.replace(/^# .*\n+/, ""), { gfm: true, async: false }) as string;
