import { join } from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Un solo .env.local en la raíz del repo para la web y para la terminal.
loadEnvConfig(join(process.cwd(), "../.."));

const config: NextConfig = {
  transpilePackages: ["@anonymo/agentes", "@anonymo/pipeline"],
  // Herramientas pesadas del pipeline: se cargan desde node_modules, no se empaquetan.
  serverExternalPackages: ["playwright", "playwright-core", "lighthouse", "@axe-core/playwright", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/trabajo/*": ["../../node_modules/@sparticuz/chromium/bin/**/*"],
    // Departamento de video (sistema/62): FFmpeg y la fuente de los números de las miniaturas.
    "/estudio/video/*/paso": ["../../node_modules/ffmpeg-static/ffmpeg", "../../node_modules/ffmpeg-static/package.json", "../../packages/pipeline/src/video/fuentes/*"],
  },
  reactStrictMode: true,
  // La web de Unmake es la portada y su banco de animaciones vive en /lab (sistema/102): páginas estáticas en public/.
  async rewrites() { return { beforeFiles: [{ source: "/", destination: "/unmake.html" }, { source: "/lab", destination: "/lab.html" }], afterFiles: [], fallback: [] }; },
  // Las páginas de la web anterior ya no existen: llevan a la portada.
  async redirects() { return ["/unmake", "/agentes", "/agentes/:r*", "/casos", "/casos/:r*", "/proceso", "/sistema", "/en", "/en/:r*"].map((source) => ({ source, destination: "/", permanent: false })); },
  // Precios en la web (web/12): solo si decides publicarlos (PRECIOS_PUBLICOS=1 y TARIFA_HORA).
  // Versión del estudio (sistema/34): hora del build y commit, para verlos en la esquina.
  env: {
    NEXT_PUBLIC_TARIFA: process.env.PRECIOS_PUBLICOS === "1" ? (process.env.TARIFA_HORA ?? "") : "",
    NEXT_PUBLIC_BUILD: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
  // Archivos del cliente: en tu máquina viajan con el formulario (hasta 25 MB cada uno); en línea suben directo a la nube (sistema/35).
  experimental: { serverActions: { bodySizeLimit: "120mb" }, proxyClientMaxBodySize: "120mb" },
};

export default config;
