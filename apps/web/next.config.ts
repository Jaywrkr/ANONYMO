import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@anonymo/agentes", "@anonymo/pipeline"],
  // Herramientas pesadas del pipeline: se cargan desde node_modules, no se empaquetan.
  serverExternalPackages: ["playwright", "playwright-core", "lighthouse", "@axe-core/playwright"],
  reactStrictMode: true,
};

export default config;
