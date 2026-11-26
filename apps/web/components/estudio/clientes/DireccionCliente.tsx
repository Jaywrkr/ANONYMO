// La Dirección del cliente en su ficha (sistema/117): una hoja visual con su marca y qué es bueno para él.
// Arriba lo que hay; si se leyó algo de su web o de su guía, «esto entendí» espera aprobación. Todo con su origen.
import { NOMBRE_ORIGEN_DIR, type DireccionCliente, type OrigenDir, type PropuestaDireccion } from "@anonymo/pipeline";
import { accionDireccion } from "@/app/estudio/cliente/acciones";
import { boton, botonLleno, campo } from "@/lib/estudio";
import { CapturarReferencias } from "./CapturarReferencias";
import { ImagenesBuenas } from "./ImagenesBuenas";

const PUNTO: Record<OrigenDir, string> = { guia: "#1f6feb", ustedes: "#1a1816", web: "#a39a92", agente: "#d4ccc0" };
const fuentesGoogle = (familias: string[]) => (familias.length ? `https://fonts.googleapis.com/css2?${familias.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`).join("&")}&display=swap` : "");

function Origen({ o }: { o: OrigenDir }) {
  return <i aria-label={`de ${NOMBRE_ORIGEN_DIR[o]}`} title={`De ${NOMBRE_ORIGEN_DIR[o]}`} className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PUNTO[o] }} />;
}

function Muestras({ colores, letras, logo }: { colores: { hex: string; nombre?: string; origen?: OrigenDir }[]; letras: { familia: string; uso?: string; origen?: OrigenDir }[]; logo?: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
      <div>
        <p className="text-[12px] text-suave">Colores</p>
        {colores.length ? (
          <ul className="mt-2 flex flex-wrap gap-3" data-colores>
            {colores.map((c) => (
              <li key={c.hex} className="grid w-14 gap-1">
                <span className="h-14 w-14 rounded-[10px] shadow-[inset_0_0_0_1px_rgba(26,24,22,.1)]" style={{ background: c.hex }} />
                <span className="flex items-center gap-1 font-mono text-[10.5px] text-medio">{c.origen && <Origen o={c.origen} />}{c.hex}</span>
                {c.nombre && <span className="-mt-1 truncate text-[10.5px] text-suave">{c.nombre}</span>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-[13px] text-suave">Sin colores todavía.</p>}
      </div>
      <div>
        <p className="text-[12px] text-suave">Letras</p>
        {letras.length ? (
          <ul className="mt-2 grid gap-2" data-letras>
            {letras.map((l) => (
              <li key={l.familia} className="min-w-0">
                <span className="block truncate text-[26px] leading-tight" style={{ fontFamily: `'${l.familia}', system-ui` }}>{l.familia}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-suave">{l.origen && <Origen o={l.origen} />}{l.uso ?? ""}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-[13px] text-suave">Sin letras todavía.</p>}
      </div>
      <div>
        <p className="text-[12px] text-suave">Logo</p>
        {logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logo} alt="Logo" className="mt-2 h-20 w-32 rounded-[10px] bg-white object-contain p-2 shadow-[inset_0_0_0_1px_rgba(26,24,22,.08)]" data-logo />
          : <p className="mt-2 text-[13px] text-suave">Sin logo.</p>}
      </div>
    </div>
  );
}

function Lista({ titulo, items, vacio }: { titulo: string; items: { texto: string; origen: OrigenDir }[]; vacio: string }) {
  return (
    <div>
      <p className="text-[12px] text-suave">{titulo}</p>
      {items.length
        ? <ul className="mt-1.5 grid gap-1 text-[14px]">{items.map((x) => <li key={x.texto} className="flex items-baseline gap-2"><Origen o={x.origen} /><span>{x.texto}</span></li>)}</ul>
        : <p className="mt-1.5 text-[13px] text-suave">{vacio}</p>}
    </div>
  );
}

/** Cada web con sus capturas (computadora y celular), su enlace y su nota. */
function Referencias({ lista }: { lista: DireccionCliente["referencias"] }) {
  return (
    <ul className="mt-2 grid gap-3 sm:grid-cols-2" data-referencias>
      {lista.map((r) => (
        <li key={r.url} className="min-w-0 rounded-2xl bg-hueso/60 p-2.5">
          {r.capturas?.length ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="flex items-start gap-2" data-capturada>
              {r.capturas.filter((c) => c.vista === "escritorio" || c.vista === "celular").map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c.archivo} src={`/material/${c.archivo}`} alt={`${r.url} en ${c.vista}`} loading="lazy" className={`rounded-[8px] object-cover object-top shadow-[0_0_0_1px_rgba(26,24,22,.08)] ${c.vista === "escritorio" ? "aspect-[16/10] w-[76%]" : "aspect-[9/16] w-[20%]"}`} />
              ))}
            </a>
          ) : <div className="grid aspect-[16/7] place-items-center rounded-[8px] bg-white/70 text-[12px] text-suave" data-sin-captura>Sin captura todavía</div>}
          <p className="mt-2 flex min-w-0 items-baseline gap-2 px-1 text-[13.5px]"><Origen o={r.origen} /><a href={r.url} target="_blank" rel="noreferrer" className="truncate underline underline-offset-4">{r.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></p>
          {r.nota && <p className="px-1 text-[12.5px] text-medio">{r.nota}</p>}
          {r.capturas?.some((c) => c.vista === "pagina") && <p data-para-publicar className="px-1 text-[12px] text-suave">Para publicar: {r.capturas.filter((c) => c.vista === "pagina").length} tramos{r.capturas.some((c) => c.vista === "logo") ? " · logo" : ""}{r.capturas.some((c) => c.vista === "video") ? " · video" : ""}</p>}
        </li>
      ))}
    </ul>
  );
}

function Entendi({ id, p }: { id: string; p: PropuestaDireccion }) {
  return (
    <div className="mt-4 rounded-2xl bg-[#eef4ff] p-4 md:p-5" data-entendi>
      <p className="text-[14px] font-medium">Esto entendí de {p.desde === "guia" ? `su guía${p.detalle ? ` «${p.detalle}»` : ""}` : `su web${p.detalle ? ` (${p.detalle})` : ""}`}</p>
      <p className="mt-0.5 text-[12.5px] text-medio">{p.desde === "guia" ? "La guía manda sobre todo lo demás." : "Lo de la web solo llena lo que falta: no pisa lo de la guía ni lo que escribieron ustedes."}</p>
      <div className="mt-4"><Muestras colores={p.colores} letras={p.letras} logo={p.logo} /></div>
      {(p.palabras.length > 0 || p.si.length > 0 || p.no.length > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-3 text-[13.5px]">
          {p.palabras.length > 0 && <div><p className="text-[12px] text-suave">Cómo debe sentirse</p><p className="mt-1">{p.palabras.join(", ")}</p></div>}
          {p.si.length > 0 && <div><p className="text-[12px] text-suave">Sí</p><ul className="mt-1 grid gap-0.5">{p.si.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {p.no.length > 0 && <div><p className="text-[12px] text-suave">No</p><ul className="mt-1 grid gap-0.5">{p.no.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        </div>
      )}
      <form action={accionDireccion} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        <button name="accion" value="aprobar" className={botonLleno} data-trabajando="Aprobando…" data-aprobar-direccion>Aprobar</button>
        <button name="accion" value="descartar" className={boton} data-trabajando="Descartando…">Descartar</button>
      </form>
    </div>
  );
}

export function DireccionDelCliente({ id, nombre, d, web }: { id: string; nombre: string; d?: DireccionCliente; web?: string }) {
  const vacia = !d || (!d.colores.length && !d.letras.length && !d.logo && !d.palabras.length && !d.si.length && !d.no.length && !d.referencias.length);
  const familias = [...new Set([...(d?.letras ?? []), ...(d?.propuesta?.letras ?? [])].map((l) => l.familia))];
  const nuestras = (lista: { texto: string; origen: OrigenDir }[] | undefined) => (lista ?? []).filter((x) => x.origen === "ustedes").map((x) => x.texto).join("\n");
  return (
    <section id="direccion" className="mt-8 scroll-mt-6 rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-6" aria-labelledby="t-direccion">
      {familias.length > 0 && <link rel="stylesheet" href={fuentesGoogle(familias)} />}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="t-direccion" className="text-[15px] font-medium">Dirección</h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-suave" aria-label="De dónde sale cada cosa">
          {(["guia", "ustedes", "web"] as OrigenDir[]).map((o) => <span key={o} className="inline-flex items-center gap-1.5"><Origen o={o} />{NOMBRE_ORIGEN_DIR[o]}</span>)}
        </p>
      </div>
      <p className="mt-1 text-[13px] text-medio">Lo que todos los agentes siguen al trabajar para {nombre}. Si algo choca, manda su guía de marca, después lo que dicen ustedes y al final su web.</p>

      {d?.propuesta && <Entendi id={id} p={d.propuesta} />}

      {/* Qué es bueno, en imágenes (sistema/123): Faro las ve al diseñar y la revisión compara cada pieza con ellas. */}
      <ImagenesBuenas id={id} nombre={nombre} imagenes={d?.imagenes ?? []} />

      {vacia && !d?.propuesta
        ? <p className="mt-5 rounded-2xl bg-hueso/70 p-4 text-[14px]" data-direccion-vacia>Todavía no tiene Dirección. Empieza leyendo su web o subiendo su guía de marca; después completan entre ustedes lo que sí, lo que no y qué es bueno para él.</p>
        : !vacia && (
          <div className="mt-5 grid gap-6" data-direccion>
            <Muestras colores={d!.colores} letras={d!.letras} logo={d!.logo?.url} />
            {d!.palabras.length > 0 && <p className="flex flex-wrap gap-1.5" data-palabras>{d!.palabras.map((p) => <span key={p.texto} className="inline-flex items-center gap-1.5 rounded-full bg-hueso px-3 py-1 text-[13px]"><Origen o={p.origen} />{p.texto}</span>)}</p>}
            <div className="grid gap-5 md:grid-cols-2">
              <Lista titulo="Sí" items={d!.si} vacio="Nada anotado." />
              <Lista titulo="No" items={d!.no} vacio="Nada anotado." />
            </div>
            {d!.referencias.some((r) => r.trabajo) && (
              <div data-trabajo>
                <p className="text-[12px] text-suave">Su trabajo real · lo que se muestra en sus piezas</p>
                <Referencias lista={d!.referencias.filter((r) => r.trabajo)} />
              </div>
            )}
            <div data-bueno>
              <p className="text-[12px] text-suave">Qué es bueno para {nombre} · la vara con la que se revisa cada entrega</p>
              {d!.referencias.some((r) => !r.trabajo)
                ? <Referencias lista={d!.referencias.filter((r) => !r.trabajo)} />
                : d!.referencias.length ? <p className="mt-1.5 text-[13px] text-suave">Su trabajo real también es la vara. Agreguen trabajos de afuera que para {nombre} estén bien hechos.</p>
                : <p className="mt-1.5 text-[13px] text-suave">Sin referencias. Agreguen dos o tres trabajos de primer nivel que para {nombre} estén bien hechos.</p>}
            </div>
            {d!.referencias.length > 0 && <CapturarReferencias id={id} pendientes={d!.referencias.filter((r) => !r.capturas?.length || !r.capturas.some((c) => c.vista === "pagina")).length} total={d!.referencias.length} />}
            {d!.aprendido.length > 0 && (
              <div data-aprendido>
                <p className="text-[12px] text-suave">Lo que dijeron al revisar</p>
                <ul className="mt-1.5 grid gap-1 text-[13.5px]">{d!.aprendido.slice(0, 5).map((a) => <li key={a.cuando + a.texto}>«{a.texto}» <span className="text-suave">· {a.por === "luna" ? "Luna" : "Jay"}{a.donde ? ` · ${a.donde}` : ""}</span></li>)}</ul>
              </div>
            )}
          </div>
        )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <form action={accionDireccion}>
          <input type="hidden" name="id" value={id} />
          <button name="accion" value="leer-web" className={boton} disabled={!web} title={web ? undefined : "Anota su web en «Contacto y notas»"} data-trabajando="Leyendo su web…" data-leer-marca>Leer su marca de la web</button>
        </form>
        <form action={accionDireccion} className="flex flex-wrap items-center gap-2" encType="multipart/form-data">
          <input type="hidden" name="id" value={id} />
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)]">
            <span>{d?.guia ? `Guía: ${d.guia.nombre}` : "Elegir su guía (PDF)"}</span>
            <input type="file" name="guia" accept="application/pdf,.pdf" className="sr-only" data-guia />
          </label>
          <button name="accion" value="guia" className={boton} data-trabajando="Leyendo su guía…">Leer la guía</button>
        </form>
      </div>

      <details className="group mt-4" data-editar-direccion>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[13px] text-medio underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">Escribir lo de ustedes</summary>
        <form action={accionDireccion} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="accion" value="editar" />
          <label className="grid gap-1 text-[13px]">Cómo debe sentirse · 3 a 5 palabras, una por línea<textarea name="palabras" rows={3} defaultValue={nuestras(d?.palabras)} className={campo} /></label>
          <label className="grid gap-1 text-[13px]">Colores · uno por línea («#0E0C0C tinta»)<textarea name="colores" rows={3} defaultValue={(d?.colores ?? []).filter((c) => c.origen === "ustedes").map((c) => `${c.hex}${c.nombre ? ` ${c.nombre}` : ""}`).join("\n")} className={campo} /></label>
          <label className="grid gap-1 text-[13px]">Lo que sí · uno por línea<textarea name="si" rows={4} defaultValue={nuestras(d?.si)} className={campo} /></label>
          <label className="grid gap-1 text-[13px]">Lo que no · uno por línea<textarea name="no" rows={4} defaultValue={nuestras(d?.no)} className={campo} /></label>
          <label className="grid gap-1 text-[13px]">Letras · la de títulos primero<textarea name="letras" rows={2} defaultValue={(d?.letras ?? []).filter((l) => l.origen === "ustedes").map((l) => l.familia).join("\n")} className={campo} /></label>
          <label className="grid gap-1 text-[13px]">Su trabajo real para mostrar · un enlace por línea, con una nota<textarea name="trabajos" rows={3} defaultValue={(d?.referencias ?? []).filter((r) => r.origen === "ustedes" && r.trabajo).map((r) => `${r.url}${r.nota ? ` — ${r.nota}` : ""}`).join("\n")} className={campo} /></label>
          <label className="grid gap-1 text-[13px]">Qué es bueno · un enlace por línea, con una nota («https://… — el aire y la letra»)<textarea name="referencias" rows={4} defaultValue={(d?.referencias ?? []).filter((r) => r.origen === "ustedes" && !r.trabajo).map((r) => `${r.url}${r.nota ? ` — ${r.nota}` : ""}`).join("\n")} className={campo} /></label>
          <div className="md:col-span-2"><button className={botonLleno} data-trabajando="Guardando…" data-guardar-direccion>Guardar la Dirección</button></div>
        </form>
      </details>
    </section>
  );
}
