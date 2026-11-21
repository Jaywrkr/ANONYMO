"use client";

// «Mi web» (sistema/98): el cliente cambia textos y fotos de su web y su asistente. Al guardar, se publica.
// Las fotos se achican en el celular antes de subir (máximo 1600 px, WebP): cargan rápido y no pesan.
import { useState } from "react";
import type { CambiosPagina, Editable, FotoEditable, PreguntaAsistente } from "@anonymo/pipeline/src/miweb-html.ts";
import { responderAsistente } from "@anonymo/pipeline/src/miweb-html.ts";

interface Pagina { pagina: string; editables: Editable[]; fotos: FotoEditable[]; cambios: CambiosPagina }
const TIPO: Record<Editable["tipo"], string> = { titulo: "Título", texto: "Texto", lista: "Lista o precio", boton: "Botón o enlace" };
const NOMBRE_PAGINA = (p: string) => (p === "index.html" ? "Inicio" : p.replace(/\.html$/, "").replace(/[-_/]/g, " ").replace(/^./, (x) => x.toUpperCase()));
const campo = "w-full rounded-xl bg-white px-3.5 py-3 text-[15px] shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)]";
const boton = "inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[14px] shadow-[inset_0_0_0_1px_var(--color-borde)] disabled:opacity-40";
const lleno = "inline-flex min-h-12 items-center rounded-full bg-tinta px-6 text-[14px] font-medium text-white disabled:opacity-40";

async function achicar(f: File): Promise<Blob> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo leer la foto."))), "image/webp", 0.85));
}

export function EditorMiWeb({ id, t, paginas: inicial, puedeDeshacer: deshacible, asistente, conIA }: { id: string; t: string; paginas: Pagina[]; puedeDeshacer: boolean; asistente?: { activo: boolean; preguntas: PreguntaAsistente[]; whatsapp?: string }; conIA: boolean }) {
  const [paginas, setPaginas] = useState(inicial);
  const [cual, setCual] = useState(inicial[0]?.pagina ?? "index.html");
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Record<string, { nuevo: string; vista: string }>>({});
  const [trabajo, setTrabajo] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [puedeDeshacer, setPuedeDeshacer] = useState(deshacible);
  const [recarga, setRecarga] = useState(0);
  const pag = paginas.find((p) => p.pagina === cual) ?? paginas[0];
  const valor = (e: Editable) => textos[e.clave] ?? pag?.cambios.textos?.[e.clave] ?? e.texto;
  const pendientes = Object.keys(textos).length + Object.keys(fotos).length;

  async function enviar(cuerpo: Record<string, unknown>, haciendo: string, hecho: string) {
    if (trabajo) return false;
    setTrabajo(haciendo);
    setAviso(null);
    try {
      const r = await fetch(`/portal/${id}/mi-web/cambiar`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t, ...cuerpo }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; paginas?: Record<string, CambiosPagina>; puedeDeshacer?: boolean };
      if (!r.ok || !j.paginas) throw new Error(j.error ?? "No se pudo guardar. Vuelve a intentar.");
      setPaginas((ps) => ps.map((p) => ({ ...p, cambios: j.paginas![p.pagina] ?? {} })));
      setPuedeDeshacer(!!j.puedeDeshacer);
      setAviso({ ok: true, texto: hecho });
      setRecarga((n) => n + 1);
      return true;
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message === "Failed to fetch" ? "Se cortó la conexión. Vuelve a intentar." : (e as Error).message });
      return false;
    } finally {
      setTrabajo("");
    }
  }

  async function publicar() {
    const ok = await enviar({ accion: "textos", pagina: pag!.pagina, textos, fotos: Object.fromEntries(Object.entries(fotos).map(([k, v]) => [k, { nuevo: v.nuevo }])) }, "Publicando", "Publicado. Ya se ve en tu web.");
    if (ok) { setTextos({}); setFotos({}); }
  }

  async function subirFoto(src: string, f: File | undefined) {
    if (!f || trabajo) return;
    setTrabajo("Subiendo la foto");
    setAviso(null);
    try {
      const b = await achicar(f);
      const r = await fetch(`/portal/${id}/mi-web/cambiar?t=${encodeURIComponent(t)}&foto=1`, { method: "POST", headers: { "content-type": b.type }, body: b });
      const j = (await r.json().catch(() => ({}))) as { error?: string; nombre?: string };
      if (!r.ok || !j.nombre) throw new Error(j.error ?? "No se pudo subir la foto.");
      setFotos((x) => ({ ...x, [src]: { nuevo: j.nombre!, vista: URL.createObjectURL(b) } }));
      setAviso({ ok: true, texto: "Foto lista. Toca «Publicar cambios» para que salga en tu web." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajo("");
    }
  }

  if (!pag) return <p className="mt-8 text-[15px] text-medio">Tu web todavía no tiene páginas para cambiar.</p>;
  return (
    <div className="mt-8 grid gap-8" data-editor-miweb>
      {paginas.length > 1 && (
        <div role="tablist" aria-label="Páginas de tu web" className="flex flex-wrap gap-2">
          {paginas.map((p) => (
            <button key={p.pagina} role="tab" type="button" aria-selected={p.pagina === cual} disabled={!!trabajo || (pendientes > 0 && p.pagina !== cual)} title={pendientes ? "Publica o descarta tus cambios antes de cambiar de página" : undefined} onClick={() => setCual(p.pagina)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-[14px] ${p.pagina === cual ? "bg-tinta text-white" : "bg-white shadow-[inset_0_0_0_1px_var(--color-borde)]"} disabled:opacity-40`}>{NOMBRE_PAGINA(p.pagina)}</button>
          ))}
        </div>
      )}

      <section aria-label="Textos" className="grid gap-4">
        <h2 className="text-[13px] text-suave">Textos de {NOMBRE_PAGINA(pag.pagina)}</h2>
        {pag.editables.map((e) => {
          const cambiado = valor(e) !== e.texto;
          return (
            <label key={e.clave} data-editable={e.clave} className="grid gap-1.5">
              <span className="text-[13px] text-medio">{TIPO[e.tipo]}{cambiado && <span className="text-[#17714a]"> · cambiado</span>}</span>
              {e.largo || e.texto.includes("\n")
                ? <textarea rows={Math.min(6, Math.max(2, Math.ceil(valor(e).length / 60)))} maxLength={600} value={valor(e)} disabled={!!trabajo} onChange={(ev) => setTextos((x) => ({ ...x, [e.clave]: ev.target.value }))} className={campo} />
                : <input maxLength={600} value={valor(e)} disabled={!!trabajo} onChange={(ev) => setTextos((x) => ({ ...x, [e.clave]: ev.target.value }))} className={campo} />}
              {cambiado && <button type="button" disabled={!!trabajo} onClick={() => setTextos((x) => ({ ...x, [e.clave]: e.texto }))} className="justify-self-start text-[12.5px] text-medio underline underline-offset-2">Volver a lo original</button>}
            </label>
          );
        })}
      </section>

      {pag.fotos.length > 0 && (
        <section aria-label="Fotos" className="grid gap-3">
          <h2 className="text-[13px] text-suave">Fotos de {NOMBRE_PAGINA(pag.pagina)}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pag.fotos.map((f) => {
              const nueva = fotos[f.src]?.vista ?? (pag.cambios.fotos?.[f.src] ? `/w/${id}/img/${pag.cambios.fotos[f.src]!.nuevo}` : `/w/${id}/${f.src}`);
              return (
                <li key={f.src} data-foto={f.src} className="grid gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={nueva} alt={f.alt || "Foto de tu web"} className="aspect-[4/3] w-full rounded-xl bg-hueso object-cover" />
                  <label className={`${boton} cursor-pointer justify-center`}>
                    {fotos[f.src] ? "Lista para publicar" : "Cambiar foto"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!trabajo} onChange={(ev) => void subirFoto(f.src, ev.target.files?.[0])} />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-[#f6f3ee]/95 p-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,.25)] backdrop-blur">
        <button type="button" data-publicar disabled={!!trabajo || !pendientes} onClick={() => void publicar()} className={lleno}>{trabajo === "Publicando" ? "Publicando…" : pendientes ? `Publicar ${pendientes} ${pendientes === 1 ? "cambio" : "cambios"}` : "Publicar cambios"}</button>
        {pendientes > 0 && <button type="button" disabled={!!trabajo} onClick={() => { setTextos({}); setFotos({}); setAviso(null); }} className={boton}>Descartar</button>}
        <button type="button" data-deshacer disabled={!!trabajo || !puedeDeshacer || pendientes > 0} onClick={() => void enviar({ accion: "deshacer" }, "Deshaciendo", "Listo: volvió como estaba antes del último cambio.")} className={boton}>Deshacer el último cambio</button>
        <p role="status" className={`w-full text-[13.5px] ${trabajo ? "text-medio" : aviso?.ok ? "text-[#17714a]" : "text-[#a33a0b]"}`}>{trabajo ? `${trabajo}…` : aviso?.texto ?? ""}</p>
      </div>

      <details className="rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
        <summary className="min-h-11 cursor-pointer content-center text-[14px] font-medium">Ver cómo se ve ahora</summary>
        <iframe key={recarga} title="Tu web" src={`/w/${id}/${pag.pagina}`} className="mt-3 h-[70vh] w-full rounded-xl border-0 bg-white" />
      </details>

      {asistente && <Asistente id={id} t={t} inicial={asistente} conIA={conIA} trabajo={trabajo} enviar={enviar} />}
    </div>
  );
}

function Asistente({ inicial, conIA, trabajo, enviar }: { id: string; t: string; inicial: { activo: boolean; preguntas: PreguntaAsistente[]; whatsapp?: string }; conIA: boolean; trabajo: string; enviar: (c: Record<string, unknown>, h: string, d: string) => Promise<boolean> }) {
  const [activo, setActivo] = useState(inicial.activo);
  const [preguntas, setPreguntas] = useState<PreguntaAsistente[]>(inicial.preguntas.length ? inicial.preguntas : [{ pregunta: "", respuesta: "" }]);
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp ?? "");
  const [prueba, setPrueba] = useState("");
  const listas = preguntas.filter((p) => p.pregunta.trim() && p.respuesta.trim());
  const r = prueba.trim() ? responderAsistente(listas, prueba) : undefined;
  return (
    <section aria-label="Asistente de tu web" data-asistente className="grid gap-4 rounded-[20px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-6">
      <div>
        <h2 className="text-[17px] font-medium">Asistente de tu web</h2>
        <p className="mt-1 text-[14px] text-medio">Responde las preguntas de tus clientes con tus propias respuestas, a cualquier hora. Lo que no sepa, los manda a tu WhatsApp.{conIA ? " Con tu plan Pro, pronto también podrá responder con IA lo que no tengas escrito." : ""}</p>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-[15px]"><input type="checkbox" checked={activo} disabled={!!trabajo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-[#17714a]" /> Mostrar el asistente en mi web</label>
      <ol className="grid gap-3">
        {preguntas.map((p, i) => (
          <li key={i} data-pregunta={i} className="grid gap-2 rounded-2xl bg-[#faf8f4] p-3">
            <input aria-label={`Pregunta ${i + 1}`} placeholder="Ej.: ¿Cuál es el horario?" maxLength={160} value={p.pregunta} disabled={!!trabajo} onChange={(e) => setPreguntas((x) => x.map((y, j) => (j === i ? { ...y, pregunta: e.target.value } : y)))} className={campo} />
            <textarea aria-label={`Respuesta ${i + 1}`} placeholder="Tu respuesta" rows={2} maxLength={600} value={p.respuesta} disabled={!!trabajo} onChange={(e) => setPreguntas((x) => x.map((y, j) => (j === i ? { ...y, respuesta: e.target.value } : y)))} className={campo} />
            <button type="button" disabled={!!trabajo} onClick={() => setPreguntas((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [{ pregunta: "", respuesta: "" }]))} className="justify-self-start text-[12.5px] text-medio underline underline-offset-2">Quitar</button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!trabajo || preguntas.length >= 30} onClick={() => setPreguntas((x) => [...x, { pregunta: "", respuesta: "" }])} className={boton}>Agregar pregunta</button>
      </div>
      <label className="grid gap-1.5 text-[13px] text-medio">Tu WhatsApp, para lo que el asistente no sepa
        <input inputMode="tel" placeholder="Ej.: 099 222 0001" maxLength={20} value={whatsapp} disabled={!!trabajo} onChange={(e) => setWhatsapp(e.target.value)} className={campo} />
      </label>
      <div className="grid gap-2 rounded-2xl bg-[#faf8f4] p-3">
        <label className="grid gap-1.5 text-[13px] text-medio">Pruébalo: escribe como lo haría un cliente
          <input data-probar value={prueba} onChange={(e) => setPrueba(e.target.value)} placeholder="Ej.: qué horario tienen" className={campo} />
        </label>
        {prueba.trim() && <p data-prueba-respuesta className="text-[14px]">{r ? `Respondería: ${r.respuesta}` : "No encontraría respuesta: mandaría a tu WhatsApp. Agrega esa pregunta si es común."}</p>}
      </div>
      <div><button type="button" data-guardar-asistente disabled={!!trabajo} onClick={() => void enviar({ accion: "asistente", activo, preguntas: listas, whatsapp }, "Guardando el asistente", activo ? "Asistente guardado. Ya sale en tu web." : "Asistente guardado y apagado.")} className={lleno}>{trabajo === "Guardando el asistente" ? "Guardando…" : "Guardar el asistente"}</button></div>
    </section>
  );
}
