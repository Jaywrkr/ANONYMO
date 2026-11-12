// La ficha de un cliente (sistema/70): todo lo suyo en un lugar, con su historia y lo que escribes a mano.
import Link from "next/link";
import { notFound } from "next/navigation";
import { numeroInternacional, puntuar, resumenFicha } from "@anonymo/pipeline";
import { exigirEstudio, serif, campo, boton, botonLleno } from "@/lib/estudio";
import { cartera } from "@/lib/cartera";
import { accionGuardarFicha } from "../acciones";

export const dynamic = "force-dynamic";

const tarjeta = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_6px_18px_-12px_rgba(40,30,20,.2)]";
const fecha = (iso: string) => (iso ? new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Guayaquil" }) : "");
const ESTADO: Record<string, string> = { plan: "Con plan de Atlas", "en-curso": "En trabajo", esperando: "Espera una decisión", parado: "En pausa", listo: "Terminado" };
const TIPO: Record<string, string> = { web: "Una web", marca: "Una marca", lanzamiento: "Un lanzamiento", todo: "Todo, desde cero" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Cliente ${(await params).id} — Estudio`, robots: { index: false } };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  const { fichas, fallas } = await cartera();
  const f = fichas.find((x) => x.id === id);
  if (!f) notFound();
  const g = f.guardada;
  const x = f.prospecto;
  const tel = numeroInternacional(f.contacto.telefono);
  const nuevoPedido = `/estudio/nuevo?${new URLSearchParams({ cliente: f.nombre, ficha: f.id })}`;
  const subirVideo = `/estudio/video?${new URLSearchParams({ cliente: f.nombre })}`;

  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <p className="text-[13px]"><Link href="/estudio/clientes" className="text-medio underline-offset-4 hover:underline">← Clientes</Link></p>
      <div className="mt-3 flex items-center gap-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[16px] font-medium" style={{ background: f.kits[0]?.color ?? "#e9e4dc", color: f.kits[0]?.color ? "#fff" : "#5d5a55" }}>{f.nombre.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || f.nombre.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className={`${serif} text-[clamp(34px,4vw,48px)] leading-none`}>{f.nombre}</h1>
          <p className="mt-1 text-[14px] text-medio">{resumenFicha(f)}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={nuevoPedido} className={botonLleno}>Nuevo pedido para {f.nombre}</Link>
        <Link href={subirVideo} className={boton}>Subir un video suyo</Link>
        {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className={boton}>WhatsApp</a>}
        {f.contacto.web && <a href={f.contacto.web} target="_blank" rel="noreferrer" className={boton}>Su web</a>}
      </div>
      {fallas.length > 0 && <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">Una parte no respondió y puede faltar algo: {fallas.join(" · ")}</p>}

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="grid content-start gap-5">
          <section className={tarjeta} aria-labelledby="t-proyectos">
            <h2 id="t-proyectos" className="text-[13px] text-suave">Pedidos y proyectos · {f.proyectos.length}</h2>
            {!f.proyectos.length && <p className="mt-2 text-[14px] text-medio">Todavía no hay pedidos. <Link href={nuevoPedido} className="underline">Cuéntale a Atlas el primero</Link>.</p>}
            <ul className="mt-2 grid gap-2">
              {f.proyectos.map((p) => (
                <li key={p.id}>
                  <Link href={`/estudio/${p.id}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-hueso/60 px-3 py-2 transition hover:bg-hueso">
                    <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{TIPO[p.tipo] ?? p.tipo}</span><span className="block text-[12px] text-suave">Pedido el {fecha(p.creado ?? p.actualizado)}</span></span>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[12px] text-medio">{ESTADO[p.estado] ?? p.estado}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={tarjeta} aria-labelledby="t-videos">
            <h2 id="t-videos" className="text-[13px] text-suave">Videos · {f.videos.length}</h2>
            {!f.videos.length && <p className="mt-2 text-[14px] text-medio">Sin videos. <Link href={subirVideo} className="underline">Sube el primero</Link> y quedará aquí.</p>}
            <ul className="mt-2 grid gap-2">
              {f.videos.map((v) => (
                <li key={v.id}><Link href={`/estudio/video/${v.id}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-hueso/60 px-3 py-2 transition hover:bg-hueso"><span className="min-w-0 flex-1 truncate text-[14px]">{v.nombre}</span><span className="shrink-0 text-[12px] text-suave">{v.formatos ? `${v.formatos} ${v.formatos === 1 ? "formato listo" : "formatos listos"}` : "en edición"}</span></Link></li>
              ))}
            </ul>
          </section>

          <section className={tarjeta} aria-labelledby="t-marca">
            <h2 id="t-marca" className="text-[13px] text-suave">Marca y contenido</h2>
            {f.kits.length ? f.kits.map((k) => <p key={k.id} className="mt-2 flex items-center gap-2 text-[14px]"><i aria-hidden className="h-4 w-4 rounded" style={{ background: k.color }} />Kit de marca para video: <Link href="/estudio/video/marcas" className="underline">{k.nombre}</Link></p>)
              : <p className="mt-2 text-[14px] text-medio">Sin kit de marca todavía. <Link href="/estudio/video/marcas" className="underline">Crear uno</Link> (logo, color y música para sus videos).</p>}
            <p className="mt-2 text-[13px] text-suave">El contenido mensual para redes todavía no está en el estudio.</p>
          </section>

          <section className={tarjeta} aria-labelledby="t-historia">
            <h2 id="t-historia" className="text-[13px] text-suave">Historia</h2>
            <ol className="mt-3 grid gap-3 border-l border-borde pl-4">
              {f.historia.map((h, i) => (
                <li key={i} className="relative text-[14px]">
                  <i aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-tinta/40" />
                  {h.enlace ? <Link href={h.enlace} className="underline-offset-4 hover:underline">{h.que}</Link> : h.que}
                  <span className="block text-[12px] text-suave">{fecha(h.cuando)}{h.por ? ` · ${h.por === "luna" ? "Luna" : "Jay"}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid content-start gap-5">
          {x && (
            <section className={tarjeta} aria-labelledby="t-origen">
              <h2 id="t-origen" className="text-[13px] text-suave">Vino de Imán · Clientes nuevos</h2>
              <p className="mt-2 text-[14px]">{x.rubro} en {x.ciudad}{x.estrellas ? ` · ★ ${x.estrellas} (${x.resenas})` : ""}</p>
              {puntuar(x).motivos.length > 0 && <p className="mt-1 text-[13px] text-medio">Su web cuando lo encontramos: {puntuar(x).motivos.join(", ").toLowerCase()}.</p>}
              {x.notas && <p className="mt-2 rounded-xl bg-hueso/60 px-3 py-2 text-[13px]">{x.notas}</p>}
              <Link href="/estudio/clientes/nuevos" className="mt-3 inline-flex min-h-11 items-center text-[13px] underline">Ver en Clientes nuevos</Link>
            </section>
          )}

          <section className={tarjeta} aria-labelledby="t-datos">
            <h2 id="t-datos" className="text-[13px] text-suave">Contacto y notas</h2>
            <form action={accionGuardarFicha} className="mt-3 grid gap-3">
              <input type="hidden" name="id" value={f.id} />
              <label className="grid gap-1 text-[13px]">Nombre<input name="nombre" required maxLength={80} defaultValue={f.nombre} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Teléfono<input name="telefono" maxLength={40} defaultValue={g?.telefono ?? f.contacto.telefono ?? ""} className={campo} inputMode="tel" /></label>
              <label className="grid gap-1 text-[13px]">Correo<input name="correo" type="email" maxLength={120} defaultValue={g?.correo ?? ""} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Web<input name="web" maxLength={200} defaultValue={g?.web ?? f.contacto.web ?? ""} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Otros nombres <span className="text-suave">· separados por coma; sus pedidos y videos entran a esta ficha</span><input name="alias" maxLength={300} defaultValue={(g?.alias ?? []).join(", ")} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Notas<textarea name="notas" rows={5} maxLength={4000} defaultValue={g?.notas ?? ""} className={campo} /></label>
              <div><button className={botonLleno} data-trabajando="Guardando la ficha…">Guardar</button></div>
              {g && <p className="text-[12px] text-suave">Cambiada por {g.por === "luna" ? "Luna" : "Jay"} el {fecha(g.actualizado)}.</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
