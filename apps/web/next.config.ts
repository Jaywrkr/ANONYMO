import { join } from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Un solo .env.local en la raíz del repo para la web y para la terminal.
loadEnvConfig(join(process.cwd(), "../.."));

const config: NextConfig = {
  transpilePackages: ["@anonymo/agentes", "@anonymo/pipeline"],
  // Herramientas pesadas del pipeline: se cargan desde node_modules, no se empaquetan.
  serverExternalPackages: ["playwright", "playwright-core", "lighthouse", "@axe-core/playwright"],
  reactStrictMode: true,
  // Fotos y PDFs del cliente (sistema/07): hasta 15 MB por archivo.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};

export default config;
