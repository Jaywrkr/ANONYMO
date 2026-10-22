import type { MetadataRoute } from "next";

// El estudio y los portales de clientes nunca se indexan (web/18).
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.ANONYMO_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/estudio", "/portal"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
