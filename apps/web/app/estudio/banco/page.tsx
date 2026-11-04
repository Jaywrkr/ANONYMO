// Banco de calibración (sistema/55): referencias de nota conocida, la rúbrica que sale de ellas y qué tan bien
// coincide el juez. Jay y Luna cambian notas, agregan o quitan referencias; eso recalcula la rúbrica y pide recalibrar.
import Link from "next/link";
import {
  DISCIPLINAS_BANCO, META, NIVELES, NOMBRE_DISCIPLINA, RUBROS, calibracionEnCurso, calibracionViva, criteriosBanco, deducirRubrica,
  leerBanco, leerCambiosBanco, leerCapturas, leerJuez, nivelDe, notaPorRubrica, pideCalibrar, rondasCalibracion, ultimoInforme,
  type DisciplinaBanco, type Medida, type Referencia,
} from "@anonymo/pipeline";
import { boton, botonSuave, campo, exigirEstudio, serif } from "@/lib/estudio";
import { traer } from "@/lib/nube";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { Refrescar } from "@/components/estudio/Refrescar";
import { accionAgregarBanco, accionCalibrar, accionDevolverBanco, accionNotaBanco, accionQuitarBanco, accionReiniciarJuez, accionSeguirCalibracion } from "@/app/estudio/acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banco de calibración — Estudio", robots: { index: false } };

const tarjeta = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]";
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)} %`);

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirEstudio();
  const q = await searchParams;
  await traer("_agencia");
  const d: DisciplinaBanco = (DISCIPLINAS_BANCO as string[]).includes(q.d ?? "") ? (q.d as DisciplinaBanco) : "web";
  const rubro = RUBROS.some((r) => r.id === q.rubro) ? q.rubro : undefined;
  const todas = leerBanco();
  const refs = todas.filter((r) => r.disciplina === d && (!rubro || r.rubro === rubro));
  const quitadas = leerBanco({ quitadas: true }).filter((r) => r.disciplina === d);
  const cambios = leerCambiosBanco();
  const capturas = leerCapturas();
  const rub = deducirRubrica(d, todas);
  const juez = leerJuez();
  const informe = ultimoInforme();
  const enCurso = calibracionEnCurso();
  const viva = calibracionViva(enCurso);
  const recalibrar = pideCalibrar();
  const volver = `/estudio/banco?d=${d}${rubro ? `&rubro=${rubro}` : ""}`;
  const m = informe?.porDisciplina[d];

  return (
    <div className="px-5 py-7 md:px-10">
      {enCurso && <Refrescar />}
      <h1 className={`${serif} text-[40px] leading-none`}>Banco de calibración.</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-medio">Trabajos premiados, muy buenos, genéricos y de principiante, con su nota. Sirven para saber si el juez califica como un jurado de verdad y para comparar lo nuestro, a ciegas, con lo mejor del mundo. Las capturas son privadas y solo sirven para medir: nunca se usan para clientes.</p>

      <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
        {DISCIPLINAS_BANCO.map((x) => {
          const n = todas.filter((r) => r.disciplina === x).length;
          return <Link key={x} href={`/estudio/banco?d=${x}`} aria-current={x === d ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 ${x === d ? "bg-tinta text-white" : "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08)]"}`}>{NOMBRE_DISCIPLINA[x]} · {n}</Link>;
        })}
      </div>

      {/* Estado del juez */}
      <section className={`${tarjeta} mt-6 max-w-4xl`} aria-label="Calibración del juez">
        <h2 className="text-[18px] font-medium">Qué tan bien coincide el juez</h2>
        {enCurso ? (
          <div className="mt-2 text-[14px]">
            <p><strong>Calibrando · ronda {enCurso.ronda} de hasta {enCurso.maxRondas}</strong> · {enCurso.resultados.length} de {enCurso.resultados.length + enCurso.pendientes.length} calificaciones a ciegas.</p>
            <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-[#eee8df]"><div className="h-full bg-tinta" style={{ width: `${Math.round((enCurso.resultados.length / Math.max(1, enCurso.resultados.length + enCurso.pendientes.length)) * 100)}%` }} /></div>
            {!viva && <form action={accionSeguirCalibracion} className="mt-3"><p className="mb-2 text-[13px] text-medio">Hace más de dos minutos que no avanza.</p><Enviar texto="Seguir calibrando" trabajando="Pidiendo que siga…" className={boton} /></form>}
          </div>
        ) : null}
        {recalibrar && !enCurso && <p className="mt-2 rounded-xl bg-[#fff4d6] px-3 py-2 text-[13px]">El banco cambió desde la última calibración (o nunca se calibró): la rúbrica ya se recalculó, pero la nota calibrada de las entregas puede estar vieja. Vuelve a calibrar.</p>}
        {m ? <Medidas m={m} /> : <p className="mt-2 text-[14px] text-medio">{informe ? `La última calibración no incluyó ${NOMBRE_DISCIPLINA[d]}.` : "Todavía no hay calibraciones. Necesita la conexión de IA; cuesta unos centavos por referencia."}</p>}
        {informe && <p className="mt-2 text-[12px] text-suave">Último informe: ronda {informe.ronda} · {new Date(informe.fecha).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {informe.modelo} · US$ {informe.usd}</p>}
        {juez.mapas[d] && <p className="mt-1 text-[12px] text-suave">Corrección vigente: nota calibrada = {juez.mapas[d]!.a} + {juez.mapas[d]!.b} × nota del juez ({juez.mapas[d]!.n} referencias).</p>}
        {!!juez.ajustes[d]?.length && <details className="mt-3 text-[13px]"><summary className="min-h-11 cursor-pointer">Lo que el juez aprendió de las rondas · {juez.ajustes[d]!.length}</summary><ul className="mt-1 grid gap-1.5">{juez.ajustes[d]!.map((x) => <li key={x}>— {x}</li>)}</ul></details>}
        {!enCurso && (
          <form action={accionCalibrar} className="mt-4 flex flex-wrap items-end gap-3 text-[13px]">
            <label className="grid gap-1">Qué calibrar<select name="disciplina" defaultValue="" className={campo}><option value="">Todas las disciplinas</option>{DISCIPLINAS_BANCO.map((x) => <option key={x} value={x}>{NOMBRE_DISCIPLINA[x]}</option>)}</select></label>
            <label className="grid gap-1">Repetir para medir consistencia<select name="repetir" defaultValue="8" className={campo}><option value="4">4 por disciplina</option><option value="8">8 por disciplina</option><option value="16">16 por disciplina</option></select></label>
            <Enviar texto="Volver a calibrar" trabajando="Preparando la calibración…" className={boton} />
          </form>
        )}
        <RondasLista />
        {(juez.ajustes[d]?.length || juez.mapas[d]) && !enCurso ? <details className="mt-2 text-[13px]"><summary className="min-h-11 cursor-pointer">Volver al juez sin ajustes</summary><form action={accionReiniciarJuez} className="mt-2"><p className="mb-2 text-medio">Borra lo aprendido y la corrección de todas las disciplinas. Los informes se conservan.</p><Enviar texto="Quitar ajustes y corrección" trabajando="Quitando…" className={botonSuave} /></form></details> : null}
      </section>

      {/* Rúbrica */}
      <section className={`${tarjeta} mt-6 max-w-4xl`} aria-label="Rúbrica">
        <h2 className="text-[18px] font-medium">La rúbrica que sale del banco</h2>
        <p className="mt-1 text-[13px] text-medio">El peso de cada criterio es cuánto separa a las premiadas de las genéricas. Suma 10. Los criterios son los del oficio (Criterio de la casa → Lo que saben los agentes); el banco solo decide cuánto pesa cada uno.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="text-suave"><tr><th className="py-2 pr-3 font-normal">Criterio</th><th className="pr-3 font-normal">Peso</th><th className="pr-3 font-normal">Lo cumplen las de 9–10</th><th className="pr-3 font-normal">las de 5–6</th><th className="font-normal">las de 3–4</th></tr></thead>
            <tbody>{rub.criterios.map((c) => <tr key={c.id} className="border-t border-black/5 align-top"><td className="py-2 pr-3">{c.texto}</td><td className="pr-3 font-mono">{c.peso.toFixed(1)}</td><td className="pr-3">{pct(c.premiadas)}</td><td className="pr-3">{pct(c.genericas)}</td><td>{pct(c.principiantes)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px]"><strong>Lo que comparten las de 9–10:</strong> {rub.comparten.map((id) => rub.criterios.find((c) => c.id === id)!.texto).join(" · ") || "todavía no hay suficientes"}.</p>
        <p className="mt-1 text-[13px]"><strong>Lo que les falta a las de 5–6:</strong> {rub.faltan.map((id) => rub.criterios.find((c) => c.id === id)!.texto).join(" · ") || "todavía no hay suficientes"}.</p>
      </section>

      {/* Referencias */}
      <section className="mt-8 max-w-5xl" aria-label="Referencias">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className={`${serif} text-[28px]`}>Referencias de {NOMBRE_DISCIPLINA[d].toLowerCase()}.</h2>
          <form className="ml-auto flex items-end gap-2 text-[13px]"><input type="hidden" name="d" value={d} /><label className="grid gap-1">Rubro<select name="rubro" defaultValue={rubro ?? ""} className={campo}><option value="">Todos</option>{RUBROS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label><button className={botonSuave}>Filtrar</button></form>
        </div>
        {NIVELES.map((nv) => {
          const deNivel = refs.filter((r) => nivelDe(r.nota) === nv.id).sort((a, b) => b.nota - a.nota);
          return (
            <div key={nv.id} className="mt-6">
              <h3 className="text-[15px] font-medium">{nv.nombre} · {nv.rango} <span className="text-suave">· {deNivel.length}</span></h3>
              {deNivel.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{deNivel.map((r) => <Tarjeta key={r.id} r={r} capturas={capturas[r.id] ?? []} revision={cambios.revision} volver={volver} rubrica={notaPorRubrica(r, rub)} />)}</div> : <p className="mt-2 text-[13px] text-medio">Ninguna{rubro ? " en este rubro" : ""}.</p>}
            </div>
          );
        })}
        {quitadas.length > 0 && <details className={`${tarjeta} mt-6`}><summary className="min-h-11 cursor-pointer text-[14px]">Quitadas del banco · {quitadas.length}</summary><ul className="mt-2 grid gap-2 text-[13px]">{quitadas.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-2"><span>{r.nombre} · {r.nota}</span><form action={accionDevolverBanco}><input type="hidden" name="ref" value={r.id} /><input type="hidden" name="revision" value={cambios.revision} /><input type="hidden" name="volver" value={volver} /><Enviar texto="Volver a poner" trabajando="Poniendo…" className={botonSuave} /></form></li>)}</ul></details>}
      </section>

      <Agregar d={d} revision={cambios.revision} />
    </div>
  );
}

function Medidas({ m }: { m: Medida }) {
  const fila = (t: string, v: string, ok: boolean | null, meta: string) => <div className="rounded-xl bg-[#f6f3ee] p-3"><p className="text-[12px] text-suave">{t}</p><p className="mt-1 text-[20px]">{v} {ok === null ? "" : ok ? "✓" : "✗"}</p><p className="text-[11px] text-suave">Meta: {meta}</p></div>;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {fila("Diferencia promedio con la nota de referencia", m.mae === null ? "—" : `${m.mae} pts`, m.mae === null ? null : m.mae <= META.mae, `≤ ${META.mae}`)}
      {fila("Bien clasificadas", pct(m.bienClasificadas), m.bienClasificadas === null ? null : m.bienClasificadas >= META.bienClasificadas, `≥ ${META.bienClasificadas * 100} %`)}
      {fila("Premiadas con 9 o más · genéricas con 6 o menos", `${m.premiadas.aciertos}/${m.premiadas.n} · ${m.bajas.aciertos}/${m.bajas.n}`, null, "todas")}
      {fila("Variación al calificar dos veces", m.consistencia.maxDif === null ? "—" : `máx. ${m.consistencia.maxDif}`, m.consistencia.maxDif === null ? null : m.consistencia.maxDif <= META.consistencia, `≤ ${META.consistencia} punto`)}
      <p className="text-[13px] sm:col-span-2 lg:col-span-4">{m.cumpleMeta ? "Llega a la meta: la nota del juez se puede leer como la de un jurado." : "No llega a la meta todavía: la nota calibrada corrige el sesgo, pero conviene revisar los ajustes o las notas del banco."} Con la corrección, la diferencia promedio queda en {m.maeCalibrada ?? "—"} pts. {m.errores ? `${m.errores} calificaciones fallaron y no cuentan.` : ""}</p>
    </div>
  );
}

function RondasLista() {
  const rondas = rondasCalibracion();
  if (!rondas.length) return null;
  return <details className="mt-3 text-[13px]"><summary className="min-h-11 cursor-pointer">Informes de cada ronda · {rondas.length}</summary><ul className="mt-1 grid gap-1">{rondas.slice(0, 30).map((r) => <li key={r.archivo}>{r.fecha.slice(0, 16).replace("T", " ")} · ronda {r.ronda} · diferencia {r.global.mae ?? "—"} · bien clasificadas {pct(r.global.bienClasificadas)} · {r.global.cumpleMeta ? "meta cumplida" : r.sigue ? "ajustó al juez y repitió" : "sin llegar a la meta"} · US$ {r.usd}</li>)}</ul></details>;
}

function Tarjeta({ r, capturas, revision, volver, rubrica }: { r: Referencia; capturas: { archivo: string; ancho?: number }[]; revision: number; volver: string; rubrica: number }) {
  const img = capturas.find((c) => c.ancho === 1440) ?? capturas[0];
  const cel = capturas.find((c) => c.ancho === 390);
  return (
    <article className={`${tarjeta} flex min-w-0 flex-col gap-2 p-4 text-[13px]`}>
      {img ? <div className="flex gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/estudio/banco/imagen/${img.archivo}`} alt={`Captura privada de ${r.nombre}`} loading="lazy" className="h-36 min-w-0 flex-1 rounded-lg bg-[#f6f3ee] object-cover object-top" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cel && <img src={`/estudio/banco/imagen/${cel.archivo}`} alt={`Captura privada de ${r.nombre} en celular`} loading="lazy" className="h-36 w-16 rounded-lg bg-[#f6f3ee] object-cover object-top" />}
      </div> : r.disciplina === "naming" ? <p className={`${serif} rounded-lg bg-[#f6f3ee] px-3 py-6 text-center text-[26px]`}>{r.nombre}</p> : <p className="rounded-lg bg-[#f6f3ee] px-3 py-6 text-center text-suave">Sin captura todavía</p>}
      <div className="flex items-start gap-2"><p className="min-w-0 flex-1 font-medium">{r.nombre}</p><span className="font-mono text-[15px]">{r.nota}</span></div>
      <p className="text-medio">{r.autor}{r.anio ? ` · ${r.anio}` : ""} · {RUBROS.find((x) => x.id === r.rubro)?.nombre ?? "Otros"}</p>
      {r.premio && <p>{r.fuente ? <a href={r.fuente} target="_blank" rel="noreferrer" className="underline">{r.premio} ↗</a> : r.premio}</p>}
      {r.cambio && <p className="text-[12px] text-suave">Nota cambiada por {r.cambio.quien === "luna" ? "Luna" : "Jay"} (era {r.notaIndice}).</p>}
      {r.agregada && <p className="text-[12px] text-suave">Agregada por {r.agregada.quien === "luna" ? "Luna" : "Jay"}.</p>}
      <p>{r.porque}</p>
      <details><summary className="min-h-11 cursor-pointer">Detalle y criterios</summary>
        <p className="mt-1 text-medio">{r.descripcion}</p>
        {r.razon && <p className="mt-1"><span className="text-suave">Razón del nombre:</span> {r.razon}</p>}
        <p className="mt-2"><span className="text-suave">Cumple:</span> {r.cumple.join(", ") || "—"}</p>
        <p><span className="text-suave">No cumple:</span> {r.falla.join(", ") || "—"}</p>
        <p className="mt-1 text-suave">Por la rúbrica le tocaría {rubrica}.</p>
        {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center underline">Ver el original ↗</a>}
      </details>
      <div className="mt-auto flex flex-wrap items-end gap-2 border-t border-black/5 pt-2">
        <form action={accionNotaBanco} className="flex items-end gap-2"><input type="hidden" name="ref" value={r.id} /><input type="hidden" name="revision" value={revision} /><input type="hidden" name="volver" value={volver} /><label className="grid gap-1 text-[12px]">Nota<input name="nota" type="number" min={0} max={10} step={0.5} defaultValue={r.nota} className={`${campo} w-20`} aria-label={`Nota de ${r.nombre}`} /></label><Enviar texto="Cambiar" trabajando="Guardando…" className={botonSuave} /></form>
        <form action={accionQuitarBanco} className="ml-auto"><input type="hidden" name="ref" value={r.id} /><input type="hidden" name="revision" value={revision} /><input type="hidden" name="volver" value={volver} /><Enviar texto="Quitar" trabajando="Quitando…" className={botonSuave} /></form>
      </div>
    </article>
  );
}

function Agregar({ d, revision }: { d: DisciplinaBanco; revision: number }) {
  const criterios = criteriosBanco(d);
  return (
    <details className={`${tarjeta} mt-8 max-w-3xl`}>
      <summary className="min-h-11 cursor-pointer text-[16px] font-medium">Agregar una referencia de {NOMBRE_DISCIPLINA[d].toLowerCase()}</summary>
      <form action={accionAgregarBanco} className="mt-3 grid gap-3 text-[14px] sm:grid-cols-2">
        <input type="hidden" name="disciplina" value={d} /><input type="hidden" name="revision" value={revision} />
        <label className="grid gap-1">{d === "naming" ? "El nombre" : "Nombre del proyecto"}<input name="nombre" required minLength={2} maxLength={120} className={campo} /></label>
        <label className="grid gap-1">Agencia o autor<input name="autor" maxLength={120} className={campo} /></label>
        <label className="grid gap-1">Rubro<select name="rubro" className={campo}>{RUBROS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
        <label className="grid gap-1">Año<input name="anio" type="number" min={1950} max={2100} defaultValue={new Date().getFullYear()} className={campo} /></label>
        <label className="grid gap-1">Nota (0–10)<input name="nota" type="number" min={0} max={10} step={0.5} required className={campo} /></label>
        <label className="grid gap-1">Premio (si tiene)<input name="premio" maxLength={200} className={campo} /></label>
        <label className="grid gap-1">Enlace a la fuente del premio<input name="fuente" type="url" placeholder="https://" className={campo} /></label>
        <label className="grid gap-1">{d === "web" ? "Dirección del sitio (para capturarlo)" : "Página del caso"}<input name="url" type="url" placeholder="https://" className={campo} /></label>
        {d === "identidad" && <label className="grid gap-1 sm:col-span-2">Enlace a la imagen del logo<input name="imagen" type="url" placeholder="https://" className={campo} /></label>}
        <label className="grid gap-1 sm:col-span-2">Cómo es (sin juicios: el juez lo lee a ciegas)<textarea name="descripcion" required minLength={20} maxLength={1200} rows={3} className={campo} /></label>
        {d === "naming" && <label className="grid gap-1 sm:col-span-2">Razón del nombre<textarea name="razon" required minLength={5} maxLength={600} rows={2} className={campo} /></label>}
        <label className="grid gap-1 sm:col-span-2">Por qué tiene esa nota<textarea name="porque" required minLength={10} maxLength={600} rows={2} className={campo} /></label>
        <fieldset className="grid gap-1 sm:col-span-2"><legend className="mb-1">Qué criterios cumple</legend>{criterios.map(([id, t]) => <label key={id} className="flex min-h-11 items-start gap-2 text-[13px]"><input type="checkbox" name="cumple" value={id} className="mt-1" /> {t}</label>)}</fieldset>
        <div className="sm:col-span-2"><Enviar texto="Agregar al banco" trabajando="Agregando y recalculando la rúbrica…" className={boton} /></div>
      </form>
      <p className="mt-3 text-[12px] text-suave">La captura se saca aparte, con internet, con <code>scripts/banco/capturar.ts --faltan</code>. Lo que no marques como cumplido cuenta como no cumplido para la rúbrica.</p>
    </details>
  );
}
