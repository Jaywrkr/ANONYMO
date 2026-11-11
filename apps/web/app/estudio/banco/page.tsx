// Banco de calibración (sistema/55): referencias de nota conocida, la rúbrica que sale de ellas y qué tan bien
// coincide el juez. Jay y Luna cambian notas, agregan o quitan referencias; eso recalcula la rúbrica y pide recalibrar.
import Link from "next/link";
import {
  DISCIPLINAS_BANCO, META, NIVELES, NOMBRE_DISCIPLINA, RUBROS, calibracionEnCurso, calibracionViva, criteriosBanco, deducirRubrica,
  capturasEnCurso, capturasVivas, estadoCapturas, ultimasCapturas, calificacionesPorRonda, leerBanco, leerCambiosBanco, leerCapturas, leerJuez, nivelDe, notaPorRubrica, pideCalibrar, rondasCalibracion, ultimoInforme,
  type DisciplinaBanco, type Medida, type Referencia,
} from "@anonymo/pipeline";
import { boton, botonSuave, campo, exigirEstudio, serif } from "@/lib/estudio";
import { traer } from "@/lib/nube";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { Refrescar } from "@/components/estudio/Refrescar";
import { accionEnlacesBanco, accionSacarCapturas, accionSeguirCapturas, accionAgregarBanco, accionCalibrar, accionCriteriosBanco, accionDevolverBanco, accionNotaBanco, accionQuitarBanco, accionReiniciarJuez, accionSeguirCalibracion } from "@/app/estudio/acciones";

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
  // Cada pestaña muestra su propia calibración (sistema/59), no la última de cualquier disciplina.
  const informe = ultimoInforme(d);
  const enCurso = calibracionEnCurso();
  const viva = calibracionViva(enCurso);
  const recalibrar = pideCalibrar();
  const volver = `/estudio/banco?d=${d}${rubro ? `&rubro=${rubro}` : ""}`;
  const m = informe?.porDisciplina[d];

  return (
    <div className="px-5 py-7 md:px-10">
      {(enCurso || capturasEnCurso()) && <Refrescar />}
      <h1 className={`${serif} text-[40px] leading-none`}>Banco de calibración.</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-medio">Trabajos premiados, muy buenos, genéricos y de principiante, con su nota. Sirven para saber si el juez califica como un jurado de verdad y para comparar lo nuestro, a ciegas, con lo mejor del mundo. Las capturas son privadas y solo sirven para medir: nunca se usan para clientes.</p>

      <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
        {DISCIPLINAS_BANCO.map((x) => {
          const n = todas.filter((r) => r.disciplina === x).length;
          return <Link key={x} href={`/estudio/banco?d=${x}`} aria-current={x === d ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 ${x === d ? "bg-tinta text-white" : "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08)]"}`}>{NOMBRE_DISCIPLINA[x]} · {n}</Link>;
        })}
      </div>

      {/* Estado del juez: todo lo de esta caja es de la disciplina de la pestaña (sistema/59). */}
      <section className={`${tarjeta} mt-6 max-w-4xl`} aria-label={`Calibración del juez en ${NOMBRE_DISCIPLINA[d]}`}>
        <h2 className="text-[18px] font-medium">Qué tan bien coincide el juez en {NOMBRE_DISCIPLINA[d].toLowerCase()}</h2>
        {enCurso && (enCurso.disciplinas.includes(d) ? (
          <div className="mt-2 text-[14px]">
            <p><strong>Calibrando {enCurso.disciplinas.length > 1 ? "las cuatro disciplinas" : NOMBRE_DISCIPLINA[d].toLowerCase()} · ronda {enCurso.ronda} de hasta {enCurso.maxRondas}</strong> · {enCurso.resultados.length} de {enCurso.resultados.length + enCurso.pendientes.length} calificaciones a ciegas.</p>
            <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-[#eee8df]"><div className="h-full bg-tinta transition-all" style={{ width: `${Math.round((enCurso.resultados.length / Math.max(1, enCurso.resultados.length + enCurso.pendientes.length)) * 100)}%` }} /></div>
            <p className="mt-2 text-[12px] text-suave">La página se actualiza sola. Puedes cerrarla: sigue trabajando.</p>
            {!viva && <form action={accionSeguirCalibracion} className="mt-3"><input type="hidden" name="volver" value={volver} /><p className="mb-2 text-[13px] text-medio">Hace más de dos minutos que no avanza.</p><Enviar texto="Seguir calibrando" trabajando="Pidiendo que siga…" className={boton} /></form>}
          </div>
        ) : (
          <p className="mt-2 rounded-xl bg-[#f6f3ee] px-3 py-2 text-[13px]">Ahora se está calibrando {enCurso.disciplinas.map((x) => NOMBRE_DISCIPLINA[x].toLowerCase()).join(", ")} ({enCurso.resultados.length} de {enCurso.resultados.length + enCurso.pendientes.length}). Cuando termine, podrás calibrar {NOMBRE_DISCIPLINA[d].toLowerCase()}.</p>
        ))}
        {recalibrar && !enCurso && <p className="mt-2 rounded-xl bg-[#fff4d6] px-3 py-2 text-[13px]">El banco cambió desde la última calibración (o nunca se calibró): la rúbrica ya se recalculó, pero la nota calibrada de las entregas puede estar vieja. Vuelve a calibrar.</p>}
        {m ? <><Medidas m={m} /><Sesgo m={m} /><Errores informe={informe!} d={d} /></> : <p className="mt-2 text-[14px] text-medio">Todavía no se calibró {NOMBRE_DISCIPLINA[d].toLowerCase()}. Necesita la conexión de IA; cuesta unos centavos por referencia.</p>}
        {informe && <p className="mt-2 text-[12px] text-suave">Último informe de {NOMBRE_DISCIPLINA[d].toLowerCase()}: ronda {informe.ronda} · {new Date(informe.fecha).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {informe.modelo}</p>}
        {juez.mapas[d] && <p className="mt-1 text-[12px] text-suave">Corrección vigente: nota calibrada = {juez.mapas[d]!.a} + {juez.mapas[d]!.b} × nota del juez ({juez.mapas[d]!.n} referencias).</p>}
        {!!juez.ajustes[d]?.length && <details className="mt-3 text-[13px]"><summary className="min-h-11 cursor-pointer">Lo que el juez aprendió en las rondas · {juez.ajustes[d]!.length}</summary><ul className="mt-1 grid gap-1.5">{juez.ajustes[d]!.map((x) => <li key={x}>— {x}</li>)}</ul></details>}
        {!enCurso && (
          <form action={accionCalibrar} className="mt-4 flex flex-wrap items-end gap-3 text-[13px]">
            <input type="hidden" name="disciplina" value={d} /><input type="hidden" name="volver" value={volver} />
            <label className="grid gap-1">Repetir para medir consistencia<select name="repetir" defaultValue="4" className={campo}><option value="4">4 piezas</option><option value="8">8 piezas</option><option value="16">16 piezas</option></select></label>
            <Enviar texto={`Calibrar ${NOMBRE_DISCIPLINA[d].toLowerCase()}`} trabajando="Preparando la calibración…" className={boton} />
            <p className="w-full text-[12px] text-suave">Unas {calificacionesPorRonda([d], 4)} calificaciones por ronda (≈ US$ {(calificacionesPorRonda([d], 4) * 0.032).toFixed(2)}), hasta 3 rondas si no llega a la meta.</p>
          </form>
        )}
        <RondasLista d={d} />
        {!enCurso && <details className="mt-2 text-[13px]"><summary className="min-h-11 cursor-pointer">Más opciones</summary>
          <form action={accionCalibrar} className="mt-2"><input type="hidden" name="disciplina" value="" /><input type="hidden" name="volver" value={volver} /><input type="hidden" name="repetir" value="8" /><p className="mb-2 text-medio">Calibrar las cuatro disciplinas de una vez: unas {calificacionesPorRonda(DISCIPLINAS_BANCO, 8)} calificaciones por ronda (≈ US$ {(calificacionesPorRonda(DISCIPLINAS_BANCO, 8) * 0.032).toFixed(2)}).</p><Enviar texto="Calibrar las cuatro" trabajando="Preparando la calibración…" className={botonSuave} /></form>
          {(juez.ajustes[d]?.length || juez.mapas[d]) ? <form action={accionReiniciarJuez} className="mt-3"><input type="hidden" name="disciplina" value={d} /><input type="hidden" name="volver" value={volver} /><p className="mb-2 text-medio">Borra lo aprendido y la corrección de {NOMBRE_DISCIPLINA[d].toLowerCase()}. Los informes se conservan.</p><Enviar texto={`Volver al juez sin ajustes en ${NOMBRE_DISCIPLINA[d].toLowerCase()}`} trabajando="Quitando…" className={botonSuave} /></form> : null}
        </details>}
      </section>

      <Capturas d={d} volver={volver} />

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
              <h3 className="text-[15px] font-medium">{nv.nombre} · {nv.rango} <span className="text-suave">· {deNivel.length}</span>{deNivel.length > 1 && <span className="ml-2 text-[12px] font-normal text-suave sm:hidden">desliza para ver más →</span>}</h3>
              {/* En celular, una referencia a la vez y se desliza (sistema/69); en pantallas grandes, la grilla. */}
              {deNivel.length ? <div className="-mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">{deNivel.map((r) => <Tarjeta key={r.id} r={r} capturas={capturas[r.id] ?? []} revision={cambios.revision} volver={volver} rubrica={notaPorRubrica(r, rub)} />)}</div> : <p className="mt-2 text-[13px] text-medio">Ninguna{rubro ? " en este rubro" : ""}.</p>}
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
      {fila("Diferencia promedio con la nota de referencia", m.mae === null ? "—" : `${Math.round(m.mae * 100) / 100} pts`, m.mae === null ? null : m.mae <= META.mae, `≤ ${META.mae}`)}
      {fila("Bien clasificadas", pct(m.bienClasificadas), m.bienClasificadas === null ? null : m.bienClasificadas >= META.bienClasificadas, `≥ ${META.bienClasificadas * 100} %`)}
      {fila("Premiadas con 9 o más · genéricas con 6 o menos", `${m.premiadas.aciertos}/${m.premiadas.n} · ${m.bajas.aciertos}/${m.bajas.n}`, null, "todas")}
      {fila("Variación al calificar dos veces", m.consistencia.maxDif === null ? "—" : `máx. ${Math.round(m.consistencia.maxDif * 10) / 10}`, m.consistencia.maxDif === null ? null : m.consistencia.maxDif <= META.consistencia, `≤ ${META.consistencia} punto`)}
      <p className="text-[13px] sm:col-span-2 lg:col-span-4">{m.cumpleMeta ? "Llega a la meta: la nota del juez se puede leer como la de un jurado." : "No llega a la meta todavía: la nota calibrada corrige el sesgo, pero conviene revisar los ajustes o las notas del banco."} Con la corrección (la «nota calibrada» que ves en cada entrega), la diferencia promedio queda en {m.maeCalibrada ?? "—"} pts{m.bienClasificadasCalibrada != null ? ` y quedan bien clasificadas el ${Math.round(m.bienClasificadasCalibrada * 100)} %` : ""}. {m.errores ? `${m.errores} calificaciones fallaron y no cuentan.` : ""}</p>
    </div>
  );
}

const firmar = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(1).replace(".", ",")}`;
/** Hacia dónde se equivoca el juez en cada nivel: así se ve si es duro con lo excelente o blando con lo genérico. */
function Sesgo({ m }: { m: Medida }) {
  const partes = NIVELES.filter((n) => m.sesgo[n.id] !== null).map((n) => ({ n, x: m.sesgo[n.id]! }));
  if (!partes.length) return null;
  const peor = [...partes].sort((a, b) => Math.abs(b.x) - Math.abs(a.x))[0];
  return (
    <div className="mt-3 rounded-xl bg-[#f6f3ee] p-3 text-[13px]">
      <p className="font-medium">Hacia dónde se equivoca (nota del juez menos la nota real)</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{partes.map(({ n, x }) => <p key={n.id}><span className="block text-[12px] text-suave">{n.nombre} · {n.rango}</span><span className="text-[18px]">{firmar(x)}</span></p>)}</div>
      {Math.abs(peor.x) >= 0.75 && <p className="mt-2">{peor.x < 0 ? `Es duro con las ${peor.n.nombre.toLowerCase()}: les pone en promedio ${firmar(peor.x)} puntos.` : `Es blando con las ${peor.n.nombre.toLowerCase()}: les pone en promedio ${firmar(peor.x)} puntos de más.`}</p>}
    </div>
  );
}

/** Las referencias donde el juez más se alejó de la nota real, para revisar si el error es del juez o de la nota. */
function Errores({ informe, d }: { informe: NonNullable<ReturnType<typeof ultimoInforme>>; d: DisciplinaBanco }) {
  const nombres = new Map(leerBanco().map((r) => [r.id, r.nombre]));
  const peores = informe.resultados.filter((r) => r.disciplina === d && r.pasada === 1 && r.nota !== undefined).map((r) => ({ ...r, dif: r.nota! - r.notaRef })).sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif)).slice(0, 10);
  if (!peores.length) return null;
  return (
    <details className="mt-3 text-[13px]"><summary className="min-h-11 cursor-pointer">Dónde más se equivocó en la ronda {informe.ronda} · {peores.length}</summary>
      <ul className="mt-1 grid gap-2">{peores.map((r) => <li key={r.ref}><strong>{nombres.get(r.ref) ?? r.ref}</strong> · nota real {r.notaRef} · el juez puso {r.nota} ({firmar(r.dif)}){r.resumen ? <span className="block text-medio">{r.resumen}</span> : null}</li>)}</ul>
      <p className="mt-2 text-suave">Si el juez tiene razón y la nota real no, cambia la nota de esa referencia más abajo.</p>
    </details>
  );
}

function RondasLista({ d }: { d: DisciplinaBanco }) {
  const rondas = rondasCalibracion(d);
  if (!rondas.length) return null;
  return <details className="mt-3 text-[13px]"><summary className="min-h-11 cursor-pointer">Informes de {NOMBRE_DISCIPLINA[d].toLowerCase()} · {rondas.length}</summary><ul className="mt-1 grid gap-1">{rondas.slice(0, 30).map((r) => <li key={r.archivo}>{r.fecha.slice(0, 16).replace("T", " ")} · ronda {r.ronda} · diferencia {r.global.mae ?? "—"} · bien clasificadas {pct(r.global.bienClasificadas)} · {r.global.cumpleMeta ? "meta cumplida" : r.sigue ? "ajustó al juez y repitió" : "sin llegar a la meta"} {r.disciplinas.length > 1 ? " · con las cuatro disciplinas" : ""} · US$ {r.usd}</li>)}</ul></details>;
}

function Tarjeta({ r, capturas, revision, volver, rubrica }: { r: Referencia; capturas: { archivo: string; ancho?: number }[]; revision: number; volver: string; rubrica: number }) {
  const img = capturas.find((c) => c.ancho === 1440) ?? capturas[0];
  const cel = capturas.find((c) => c.ancho === 390);
  return (
    <article className={`${tarjeta} flex w-[86%] min-w-0 shrink-0 snap-center flex-col gap-2 p-4 text-[13px] sm:w-auto sm:shrink`}>
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
        {/* Jay y Luna marcan qué cumple (sistema/60): lo no marcado cuenta como no cumplido y la rúbrica se recalcula. */}
        <form action={accionCriteriosBanco} className="mt-2 grid gap-1">
          <input type="hidden" name="ref" value={r.id} /><input type="hidden" name="revision" value={revision} /><input type="hidden" name="volver" value={volver} />
          <p className="text-suave">Qué cumple{r.criteriosPor ? ` · marcado por ${r.criteriosPor.quien === "luna" ? "Luna" : "Jay"}` : ""}:</p>
          {criteriosBanco(r.disciplina).map(([id, t]) => {
            const sinMarcar = !r.cumple.includes(id) && !r.falla.includes(id);
            return <label key={id} className="flex min-h-11 items-start gap-2"><input type="checkbox" name="cumple" value={id} defaultChecked={r.cumple.includes(id)} className="mt-1" /><span>{t}{sinMarcar ? <em className="text-suave"> (sin marcar)</em> : null}</span></label>;
          })}
          <div><Enviar texto="Guardar criterios" trabajando="Guardando y recalculando…" className={botonSuave} /></div>
        </form>
        <p className="mt-1 text-suave">Por la rúbrica le tocaría {rubrica}.</p>
        {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center underline">Ver el original ↗</a>}
        {r.disciplina !== "naming" && !r.plantilla && (
          <form action={accionEnlacesBanco} className="mt-2 grid gap-2 border-t border-black/5 pt-2">
            <input type="hidden" name="ref" value={r.id} /><input type="hidden" name="revision" value={revision} /><input type="hidden" name="volver" value={volver} />
            <p className="text-suave">De dónde sale la captura</p>
            <label className="grid gap-1">{r.disciplina === "web" ? "Dirección del sitio" : "Página del caso"}<input name="url" type="url" defaultValue={r.url ?? ""} placeholder="https://" className={campo} /></label>
            {r.disciplina !== "web" && <label className="grid gap-1">{r.disciplina === "identidad" ? "Imagen del logo (mejor que la página)" : "Imagen de una pieza (mejor que la página del caso)"}<input name="imagen" type="url" defaultValue={r.imagen ?? ""} placeholder="https://" className={campo} /></label>}
            <div><Enviar texto="Guardar enlaces" trabajando="Guardando…" className={botonSuave} /></div>
          </form>
        )}
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
        {(d === "identidad" || d === "contenido") && <label className="grid gap-1 sm:col-span-2">{d === "identidad" ? "Enlace a la imagen del logo" : "Enlace a una imagen de la pieza (un post o un cuadro del video)"}<input name="imagen" type="url" placeholder="https://" className={campo} /></label>}
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

/** Capturas para el juez (sistema/61): se sacan desde aquí, en segundo plano, y solo sirven para medir. */
function Capturas({ d, volver }: { d: DisciplinaBanco; volver: string }) {
  if (d === "naming") return <section className={`${tarjeta} mt-6 max-w-4xl text-[14px]`} aria-label="Capturas"><h2 className="text-[18px] font-medium">Capturas</h2><p className="mt-1 text-medio">Naming es texto: el juez lee el nombre y su razón, no necesita imágenes.</p></section>;
  const e = estadoCapturas(d);
  const c = capturasEnCurso();
  const aqui = c && c.disciplinas.includes(d);
  const ultima = ultimasCapturas();
  const ult = ultima && ultima.disciplinas.includes(d) ? ultima : undefined;
  const fallas = (aqui ? c!.hechas : ult?.hechas ?? []).filter((h) => !h.ok);
  const nombre = NOMBRE_DISCIPLINA[d].toLowerCase();
  const faltan = e.posibles - e.con;
  return (
    <section className={`${tarjeta} mt-6 max-w-4xl text-[14px]`} aria-label="Capturas">
      <h2 className="text-[18px] font-medium">Capturas para el juez</h2>
      <p className="mt-1 text-medio">Para que el juez vea las piezas y no solo las lea. Son privadas, solo sirven para medir y nunca se usan para clientes.</p>
      <p className="mt-3"><strong>{e.con} de {e.posibles}</strong> referencias de {nombre} tienen captura.{e.sinFuente ? ` ${e.sinFuente} no tienen sitio, imagen ni página del caso: agrégales un enlace para poder capturarlas.` : ""}</p>
      {c ? (aqui ? (
        <div className="mt-3">
          <p><strong>Sacando capturas</strong> · {c.hechas.length} de {c.hechas.length + c.pendientes.length}{c.hechas.length ? ` · ${c.hechas.filter((h) => h.ok).length} bien, ${c.hechas.filter((h) => !h.ok).length} no se pudieron` : ""}.</p>
          <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-[#eee8df]"><div className="h-full bg-tinta transition-all" style={{ width: `${Math.round((c.hechas.length / Math.max(1, c.hechas.length + c.pendientes.length)) * 100)}%` }} /></div>
          <p className="mt-2 text-[12px] text-suave">Unos 30 segundos por referencia. La página se actualiza sola y puedes cerrarla: sigue trabajando.</p>
          {!capturasVivas(c) && <form action={accionSeguirCapturas} className="mt-3"><input type="hidden" name="volver" value={volver} /><p className="mb-2 text-[13px] text-medio">Hace más de dos minutos que no avanza.</p><Enviar texto="Seguir sacando capturas" trabajando="Pidiendo que siga…" className={boton} /></form>}
        </div>
      ) : <p className="mt-3 rounded-xl bg-[#f6f3ee] px-3 py-2 text-[13px]">Ahora se están sacando capturas de {c.disciplinas.map((x) => NOMBRE_DISCIPLINA[x].toLowerCase()).join(", ")}. Cuando termine, podrás sacar las de {nombre}.</p>) : (
        <>
          {ult && <p className="mt-2 text-[13px] text-medio">Última vez: {new Date(ult.fin).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {ult.hechas.filter((h) => h.ok).length} bien, {fallas.length} no se pudieron.</p>}
          {faltan > 0 ? (
            <form action={accionSacarCapturas} className="mt-3 flex flex-wrap items-center gap-3"><input type="hidden" name="disciplina" value={d} /><input type="hidden" name="volver" value={volver} /><Enviar texto={`Sacar las ${faltan} que faltan`} trabajando="Preparando las capturas…" className={boton} /><span className="text-[12px] text-suave">Sin costo de IA. Unos {Math.max(1, Math.round((faltan * 30) / 60))} minutos.</span></form>
          ) : <p className="mt-3 text-[13px]">Ya están todas. Revisa las miniaturas abajo y marca en cada tarjeta qué criterios cumple.</p>}
          <details className="mt-2 text-[13px]"><summary className="min-h-11 cursor-pointer">Más opciones</summary><form action={accionSacarCapturas} className="mt-2"><input type="hidden" name="disciplina" value={d} /><input type="hidden" name="todas" value="1" /><input type="hidden" name="volver" value={volver} /><p className="mb-2 text-medio">Vuelve a sacar las {e.posibles} capturas de {nombre} (por ejemplo, si un sitio cambió). Reemplaza las anteriores.</p><Enviar texto="Volver a sacar todas" trabajando="Preparando las capturas…" className={botonSuave} /></form></details>
        </>
      )}
      {fallas.length > 0 && <details className="mt-2 text-[13px]"><summary className="min-h-11 cursor-pointer">No se pudieron capturar · {fallas.length}</summary><ul className="mt-1 grid gap-1.5">{fallas.map((h) => <li key={h.ref}><strong>{h.nombre}</strong> · {h.error}</li>)}</ul><p className="mt-2 text-suave">Puedes cambiar su enlace o agregar una imagen de la pieza, y volver a intentarlo con «Sacar las que faltan».</p></details>}
    </section>
  );
}
