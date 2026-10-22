import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@anonymo/agentes", "@anonymo/pipeline"],
  // Herramientas pesadas del pipeline: se cargan desde node_modules, no se empaquetan.
  serverExternalPackages: ["playwright", "playwright-core", "lighthouse", "@axe-core/playwright"],
  reactStrictMode: true,
  // Fotos y PDFs del cliente (sistema/07): hasta 15 MB por archivo.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};

export default config;
