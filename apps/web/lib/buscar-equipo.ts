// "¿Quién hace logos?": busca agentes por oficio, en español o inglés (web/11).
import { AGENTES, AGENTES_EN, AREAS, AREAS_EN, type Agente } from "@anonymo/agentes";

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palabras que la gente usa y que no siempre están en el rol. */
const SINONIMOS: Record<string, string[]> = {
  web: ["orla", "vector", "lumen", "prisma"], website: ["orla", "vector", "lumen", "prisma"], pagina: ["orla", "vector"],
  redes: ["chispa", "faro"], social: ["chispa", "faro"], instagram: ["chispa", "faro"], tiktok: ["chispa", "corte"],
  precio: ["ledger", "iman"], precios: ["ledger", "iman"], price: ["ledger", "iman"], plata: ["ledger"], dinero: ["ledger"], money: ["ledger"],
  video: ["corte", "kine"], reel: ["corte"], reels: ["corte"], foto: ["lente"], fotos: ["lente"], photo: ["lente"], photos: ["lente"], shooting: ["lente"], sesion: ["lente"],
  evento: ["escena"], fiesta: ["escena"], party: ["escena"], nombre: ["verba"], name: ["verba"], naming: ["verba"],
  marca: ["nova", "mira", "rhea"], brand: ["nova", "mira", "rhea"], logo: ["mira", "kine"], logos: ["mira", "kine"],
  texto: ["rhea"], textos: ["rhea"], copy: ["rhea"], animacion: ["kine"], animation: ["kine"], musica: ["eco"], music: ["eco"],
  "3d": ["lumen"], seo: ["prisma"], premios: ["trofeo"], awards: ["trofeo"], metricas: ["pulso"], metrics: ["pulso"], datos: ["pulso", "sonda"], data: ["pulso", "sonda"],
  plan: ["atlas", "tempo"], calendario: ["tempo"], fechas: ["tempo"], investigacion: ["sonda"], research: ["sonda"], ventas: ["iman"], sales: ["iman"],
};

export function buscarAgentes(consulta: string, lista: Agente[] = AGENTES): Agente[] {
  const palabras = normal(consulta).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !["quien", "hace", "who", "does", "el", "la", "los", "the", "de"].includes(w));
  if (!palabras.length) return lista;
  return lista
    .map((a) => {
      const en = AGENTES_EN[a.id];
      const texto = normal([a.nombre, a.rol, a.caracter, a.superpoder, a.frase, a.adn, a.propNombre, AREAS[a.area].nombre, AREAS_EN[a.area], en?.rol, en?.superpoder, en?.propNombre].join(" "));
      const puntos = palabras.reduce((s, w) => s + (texto.includes(w) ? 2 : 0) + (SINONIMOS[w]?.includes(a.id) ? 3 : 0) + (normal(a.rol).includes(w) || normal(en?.rol ?? "").includes(w) ? 2 : 0), 0);
      return { a, puntos };
    })
    .filter((x) => x.puntos > 0)
    .sort((x, y) => y.puntos - x.puntos)
    .map((x) => x.a);
}
