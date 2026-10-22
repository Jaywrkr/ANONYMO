import type { MetadataRoute } from "next";
import { AGENTES } from "@anonymo/agentes";
import { casosPublicos } from "@/lib/proyectos";

const base = () => (process.env.ANONYMO_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Mapa del sitio (web/18): cada página en español con su par en inglés.
export default function sitemap(): MetadataRoute.Sitemap {
  const rutas = ["/", "/agentes", "/sala", "/proceso", "/casos", "/contacto", ...AGENTES.map((a) => `/agentes/${a.id}`)];
  const ahora = new Date();
  const entradas = rutas.map((r) => ({
    url: `${base()}${r === "/" ? "" : r}`,
    lastModified: ahora,
    changeFrequency: r.startsWith("/sala") ? ("daily" as const) : ("weekly" as const),
    priority: r === "/" ? 1 : r.startsWith("/agentes/") ? 0.5 : 0.8,
    alternates: { languages: { es: `${base()}${r === "/" ? "" : r}`, en: `${base()}/en${r === "/" ? "" : r}` } },
  }));
  const casos = casosPublicos().map((c) => ({ url: `${base()}/casos/${c.id}`, lastModified: ahora, priority: 0.7 }));
  return [...entradas, ...casos];
}
