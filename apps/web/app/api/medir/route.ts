import { nubeActiva, registrar, subirRuta } from "@anonymo/pipeline";

// Recibe eventos anónimos de la web (web/19). Si no hay disco (hosting estático), se descarta en silencio.
export async function POST(req: Request) {
  try {
    const d = JSON.parse(await req.text());
    // En línea cada evento va en su propio archivo y sube a la nube privada.
    const rel = registrar({ e: String(d.e), ruta: String(d.ruta), idioma: d.idioma, equipo: d.equipo, origen: d.origen, valor: d.valor }, nubeActiva());
    if (rel && nubeActiva()) await subirRuta(rel);
  } catch {}
  return new Response(null, { status: 204 });
}
