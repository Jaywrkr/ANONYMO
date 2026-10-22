// Dominios y redes: qué nombres están libres. RDAP es público y no necesita clave.

export type EstadoDominio = "libre" | "tomado" | "verificar";

export interface Chequeo {
  nombre: string;
  usuario: string;
  dominios: { dominio: string; estado: EstadoDominio; detalle?: string }[];
  redes: { red: string; enlace: string }[];
}

/** "Café Lúcuma" → "cafelucuma" */
export const usuarioDe = (nombre: string) =>
  nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** TLDs que se revisan solos por RDAP. El .ec no tiene RDAP público: queda para revisar a mano. */
const TLDS = ["com", "co", "studio"];

async function rdap(dominio: string, f: typeof fetch): Promise<{ estado: EstadoDominio; detalle?: string }> {
  try {
    const r = await f(`https://rdap.org/domain/${dominio}`, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return { estado: "libre" };
    if (r.ok) return { estado: "tomado" };
    return { estado: "verificar", detalle: `RDAP respondió ${r.status}` };
  } catch (e) {
    return { estado: "verificar", detalle: `Sin conexión a RDAP (${(e as Error).message.slice(0, 60)})` };
  }
}

export async function chequear(nombres: string[], f: typeof fetch = fetch): Promise<Chequeo[]> {
  const unicos = [...new Set(nombres.map((n) => n.trim()).filter(Boolean))].slice(0, 8);
  return Promise.all(
    unicos.map(async (nombre) => {
      const usuario = usuarioDe(nombre);
      const dominios = await Promise.all(TLDS.map(async (t) => ({ dominio: `${usuario}.${t}`, ...(await rdap(`${usuario}.${t}`, f)) })));
      dominios.push({ dominio: `${usuario}.ec`, estado: "verificar", detalle: "Revisar en nic.ec" });
      return {
        nombre,
        usuario,
        dominios,
        // Instagram y TikTok piden sesión para saber si un usuario existe: se revisan a mano con estos enlaces.
        redes: [
          { red: "Instagram", enlace: `https://www.instagram.com/${usuario}/` },
          { red: "TikTok", enlace: `https://www.tiktok.com/@${usuario}` },
        ],
      };
    }),
  );
}

const ICONO: Record<EstadoDominio, string> = { libre: "libre", tomado: "tomado", verificar: "verificar" };

export function resumenChequeo(c: Chequeo[]): string {
  const filas = c.map((x) => `| ${x.nombre} | ${x.dominios.map((d) => `${d.dominio}: ${ICONO[d.estado]}`).join(" · ")} | ${x.redes.map((r) => `[${r.red}](${r.enlace})`).join(" · ")} |`);
  return ["| Nombre | Dominios | Redes (revisar a mano) |", "|---|---|---|", ...filas].join("\n");
}
