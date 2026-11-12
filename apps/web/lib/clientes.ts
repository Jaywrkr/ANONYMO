// Ayudas del escritorio de Imán, clientes nuevos (sistema/66).
import { ESTADOS_PROSPECTO, contactadoEn, idFicha, idMuestra, mensajeSeguimiento, plantillaDe, tocaSeguimiento, enlaceWhatsapp, esCelular, mensajeInicial, pedidoDesdeProspecto, puntuar, type ListaProspectos, type Prospecto } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

export const mal = (error: string, status = 400) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

/** Solo Jay y Luna. */
export async function permiso() {
  const yo = await quienEsta();
  if (!yo) return { error: mal("Tu sesión terminó. Vuelve a entrar.", 403) };
  return { yo };
}

/** Lo que ve el navegador de cada negocio: ya puntuado, con su mensaje y su enlace de WhatsApp. */
export function vistaProspecto(p: Prospecto, firma: string, base: string) {
  const { puntaje, motivos, buenaFama } = puntuar(p);
  // La muestra (sistema/72): su idea de web, en /m/<id>. El enlace va dentro del primer mensaje.
  const muestra = `${base}/m/${idMuestra(p)}`;
  // La propuesta (sistema/80): precio, plazos y «Aceptar», en /p/<id>. Va en el seguimiento.
  const propuesta = `${base}/p/${idMuestra(p)}`;
  const seguir = mensajeSeguimiento(p, firma, muestra, propuesta);
  const mensaje = p.mensaje ?? mensajeInicial(p, firma, new Date(), muestra);
  const ficha = idFicha(p.nombre);
  const q = new URLSearchParams({ q: pedidoDesdeProspecto(p), cliente: p.nombre.slice(0, 80), ficha, prospecto: p.id });
  // Tiene ficha cuando ya hay relación o se volvió pedido (sistema/70).
  const conFicha = !!p.proyecto || ["respondio", "reunion", "cliente"].includes(p.estado);
  return {
    id: p.id,
    nombre: p.nombre,
    rubro: p.rubro,
    ciudad: p.ciudad,
    direccion: p.direccion,
    estrellas: p.estrellas,
    resenas: p.resenas,
    web: p.web,
    telefono: p.telefono,
    mapa: p.mapa,
    revisada: !p.web || !!p.revision,
    tipoWeb: !p.web ? "sin" : !p.revision ? "pendiente" : p.revision.estado,
    detalleWeb: p.revision?.estado === "ok" ? [p.revision.hechaCon ?? "web propia", `${(p.revision.ms / 1000).toFixed(1)} s`].join(" · ") : undefined,
    estado: p.estado,
    notas: p.notas ?? "",
    mensaje,
    mensajePropio: p.mensaje !== undefined,
    whatsapp: enlaceWhatsapp(p.telefono, mensaje),
    celular: esCelular(p.telefono),
    puntaje,
    motivos,
    buenaFama,
    pedido: `/estudio/nuevo?${q}`,
    ficha: conFicha ? `/estudio/cliente/${ficha}` : undefined,
    proyecto: p.proyecto ? `/estudio/${p.proyecto}` : undefined,
    actualizado: p.actualizado,
    /** Cuándo se le escribió por primera vez (sistema/71): cuenta para la tanda del día. */
    contactado: contactadoEn(p),
    /** Lo que Sonda leyó en su web. */
    sonda: p.revision?.estado === "ok" ? p.revision.sonda : undefined,
    muestra,
    vistas: p.muestra?.vistas ?? 0,
    ultimaVista: p.muestra?.ultima,
    quiere: p.muestra?.quiere,
    /** Su plantilla (sistema/79) y si alguien la eligió a mano. */
    plantilla: plantillaDe(p),
    plantillaElegida: !!p.plantilla,
    /** Seguimiento y propuesta (sistema/80). */
    propuesta,
    tocaSeguimiento: tocaSeguimiento(p),
    seguimiento: p.seguimiento,
    mensajeSeguimiento: seguir,
    whatsappSeguimiento: enlaceWhatsapp(p.telefono, seguir),
    vistasPropuesta: p.propuesta?.vistas ?? 0,
    acepto: p.propuesta?.acepto,
  };
}
export type VistaProspecto = ReturnType<typeof vistaProspecto>;

export const vistaLista = (l: ListaProspectos, base: string) => ({
  firma: l.firma,
  numero: l.numero ?? "",
  prospectos: Object.values(l.prospectos).map((p) => vistaProspecto(p, l.firma, base)),
});
export type VistaLista = ReturnType<typeof vistaLista>;

export const ESTADOS = Object.entries(ESTADOS_PROSPECTO) as [Prospecto["estado"], string][];
