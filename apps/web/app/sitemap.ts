import type { MetadataRoute } from "next";

const base = () => (process.env.ANONYMO_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Mapa del sitio de Unmake (sistema/102): la web, el laboratorio y el contacto.
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  return ["/", "/lab", "/contacto"].map((r) => ({ url: `${base()}${r === "/" ? "" : r}`, lastModified: ahora, changeFrequency: "weekly" as const, priority: r === "/" ? 1 : 0.7 }));
}
