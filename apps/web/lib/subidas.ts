// Los archivos de un formulario (sistema/35): los que viajan en el pedido (en tu máquina)
// y los que el navegador ya subió directo a la nube (en línea, sin el límite de 4,5 MB de Vercel).
import { recogerSubida } from "@anonymo/pipeline";

export async function archivosDe(f: FormData, max = 24): Promise<{ nombre: string; datos: Buffer }[]> {
  const enPedido = await Promise.all(
    f.getAll("archivos").filter((x): x is File => x instanceof File && x.size > 0).map(async (a) => ({ nombre: a.name, datos: Buffer.from(await a.arrayBuffer()) })),
  );
  const claves = f.getAll("subida").map(String).filter(Boolean).slice(0, max);
  const directos = await Promise.all(claves.map((c) => recogerSubida(c)));
  return [...enPedido, ...directos].slice(0, max);
}
