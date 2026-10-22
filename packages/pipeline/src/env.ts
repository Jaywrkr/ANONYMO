// Carga el .env.local de la raíz del repo antes que cualquier otro módulo (lo importa primero cli.ts).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

let d = process.cwd();
for (let i = 0; i < 6; i++) {
  const pkg = join(d, "package.json");
  if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf8")).name === "anonymo") {
    if (existsSync(join(d, ".env.local"))) process.loadEnvFile(join(d, ".env.local"));
    break;
  }
  d = dirname(d);
}
