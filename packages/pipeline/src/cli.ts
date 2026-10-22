// pipeline: la terminal del equipo. Uso: npm run pipeline -- <comando> [opciones]
import { relative } from "node:path";
import { agentePorId, FASES, PEDIDOS, type TipoPedido } from "@anonymo/agentes";
import { CARPETA, leerEntrega, leerProyecto, listar } from "./almacen.ts";
import { leerPausas } from "./atlas.ts";
import { contratoPorId } from "./contratos.ts";
import { aprobar, avanzar, cambiar, cambiarPausas, cambiarUrl, nuevo, parar, reanudar } from "./correr.ts";
import { auditar, resumenAuditoria } from "./herramientas/auditar.ts";
import { chequear, resumenChequeo } from "./herramientas/dominios.ts";
import { elegirMotor } from "./motor.ts";
import { leerNota, NOMBRE_CRITERIO, RONDAS_MAX, type Criterio } from "./jurado.ts";
import { NOTA_MINIMA, type Pedido, type Proyecto, type Puerta } from "./tipos.ts";

const AYUDA = `
pipeline · el equipo de 22 agentes trabajando un pedido

  nuevo     --cliente "Clínica Sonrisa" --tipo web --descripcion "..."
            [--rubro --ciudad --publico --plazo --presupuesto --referencias "a,b"]
            [--sin-marca | --con-marca] [--url https://...] [--pausas clave|nunca|cada-fase|1,4] [--id slug]
  estado    <id>                 dónde va y qué dijo cada agente
  lista                          todos los proyectos
  aprobar   <id> [--nota "..."]  sigue a la próxima fase
  cambiar   <id> --nota "..." [--agente orla]   rehace la fase (o un agente)
  parar     <id> [--nota "..."]  detiene el proyecto
  reanudar  <id>                 vuelve a esperar tu decisión
  pausas    <id> <clave|nunca|cada-fase|1,4>    cambia dónde se detiene
  seguir    <id>                 continúa si quedó a medias
  url       <id> <url>           la web que audita Prisma

Herramientas sueltas:
  dominios  "Nombre 1" "Nombre 2"   dominios libres y enlaces de redes
  auditar   <url>                   Lighthouse (celular y escritorio) + accesibilidad

  --quien jay|luna  quién decide (por defecto jay)
  --simulado        no usa la clave aunque exista
`;

function leerArgs(argv: string[]) {
  const pos: string[] = [];
  const op: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) op[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) op[k] = argv[++i];
      else op[k] = true;
    } else pos.push(a);
  }
  return { pos, op };
}

const slug = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const texto = (v: string | true | undefined) => (typeof v === "string" ? v : undefined);
const nombreFase = (n: number) => FASES.find((f) => f.n === n)?.nombre ?? `Fase ${n}`;

function resumen(p: Proyecto) {
  const id = p.pedido.id;
  const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
  const total = p.plan.tareas.length;
  console.log(`\n${p.pedido.cliente} · ${PEDIDOS[p.pedido.tipo].nombre.toLowerCase()} · ${hechas}/${total} tareas · ${p.estado}`);
  console.log(`Fases ${p.plan.fases.join(" → ")} · pausas en ${p.plan.pausas.join(", ") || "ninguna"}`);

  if (p.estado === "esperando" || p.estado === "listo") {
    const fases = p.estado === "listo" ? p.plan.fases : [p.faseActual];
    for (const f of fases) {
      console.log(`\n${String(f).padStart(2, "0")} ${nombreFase(f)}`);
      for (const t of p.plan.tareas.filter((x) => x.startsWith(`${f}.`))) {
        const e = leerEntrega(id, t);
        if (!e) continue;
        const a = agentePorId(e.agente)!;
        console.log(`  ${a.nombre.padEnd(7)} ${e.dice}`);
        console.log(`  ${"".padEnd(7)} Necesita: ${e.necesita}${e.nota !== undefined ? ` · Nota: ${e.nota}` : ""}`);
      }
    }
  }
  const jurado = leerNota(leerEntrega(id, "6.trofeo"));
  if (jurado) {
    const crit = (Object.entries(jurado.criterios) as [Criterio, number][]).map(([k, v]) => `${NOMBRE_CRITERIO[k]} ${v}`).join(" · ");
    console.log(`\nJurado: ${jurado.final} / mínimo ${NOTA_MINIMA}${crit ? ` (${crit})` : ""} · rondas de mejora: ${p.rondasJurado ?? 0}`);
  }
  if (p.esperaJurado) {
    console.log(`\nEl Jurado no llegó a ${NOTA_MINIMA} después de ${RONDAS_MAX} rondas automáticas. Decide:`);
    console.log(`  npm run pipeline -- aprobar ${id}                         cerrar así`);
    console.log(`  npm run pipeline -- cambiar ${id} --nota "..." --agente trofeo   recalificar con tu criterio`);
    console.log(`  npm run pipeline -- parar ${id}`);
  } else if (p.estado === "esperando") {
    console.log(`\nTerminó ${nombreFase(p.faseActual)}. Revisa ${relative(process.cwd(), CARPETA) || "."}/${id}/entregas y decide:`);
    console.log(`  npm run pipeline -- aprobar ${id}`);
    console.log(`  npm run pipeline -- cambiar ${id} --nota "qué cambiar" [--agente nombre]`);
    console.log(`  npm run pipeline -- parar ${id}`);
  }
  if (p.estado === "listo") console.log(`\nListo. Todo en ${relative(process.cwd(), CARPETA) || "."}/${id}`);
  if (p.plan.preguntas.length && p.estado !== "listo") console.log(`\nAtlas necesita saber:\n${p.plan.preguntas.map((q) => `  - ${q}`).join("\n")}`);
}

async function main() {
  const { pos, op } = leerArgs(process.argv.slice(2));
  const [cmd, id] = pos;
  const motor = elegirMotor(op.simulado === true);
  const quien = (texto(op.quien) ?? "jay") as Puerta["quien"];
  if (!["jay", "luna"].includes(quien)) throw new Error("--quien debe ser jay o luna.");
  const necesitaId = () => {
    if (!id) throw new Error(`Falta el id. Ej.: npm run pipeline -- ${cmd} clinica-sonrisa`);
    return id;
  };

  switch (cmd) {
    case "nuevo": {
      const cliente = texto(op.cliente);
      const tipo = texto(op.tipo) as TipoPedido | undefined;
      const descripcion = texto(op.descripcion);
      if (!cliente || !descripcion || !tipo || !(tipo in PEDIDOS))
        throw new Error(`Faltan datos. Necesito --cliente, --descripcion y --tipo (${Object.keys(PEDIDOS).join(", ")}).`);
      const pedido: Pedido = {
        id: texto(op.id) ?? slug(cliente),
        cliente,
        tipo,
        descripcion,
        contexto: {
          rubro: texto(op.rubro),
          ciudad: texto(op.ciudad),
          publico: texto(op.publico),
          plazo: texto(op.plazo),
          presupuesto: texto(op.presupuesto),
          url: texto(op.url),
          referencias: texto(op.referencias)?.split(",").map((s) => s.trim()).filter(Boolean),
          tieneMarca: op["sin-marca"] ? false : op["con-marca"] ? true : undefined,
        },
        pausas: texto(op.pausas) ? leerPausas(texto(op.pausas)!) : undefined,
        creado: new Date().toISOString(),
      };
      console.log(`Atlas recibe el pedido de ${cliente} (motor: ${motor.nombre}).`);
      return resumen(await nuevo(pedido, motor));
    }
    case "estado":
      return resumen(leerProyecto(necesitaId()));
    case "lista": {
      const todos = listar();
      if (!todos.length) return console.log("No hay proyectos todavía.");
      for (const p of todos) {
        const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
        console.log(`${p.pedido.id.padEnd(24)} ${p.estado.padEnd(10)} fase ${p.faseActual} · ${hechas}/${p.plan.tareas.length}`);
      }
      return;
    }
    case "aprobar":
      return resumen(await aprobar(necesitaId(), quien, texto(op.nota), motor));
    case "cambiar": {
      const nota = texto(op.nota);
      if (!nota) throw new Error('Falta --nota "qué cambiar".');
      const agente = texto(op.agente)?.toLowerCase();
      if (agente && !contratoPorId(`${leerProyecto(necesitaId()).faseActual}.${agente}`)) throw new Error(`${agente} no trabaja en esta fase.`);
      return resumen(await cambiar(necesitaId(), quien, nota, agente, motor));
    }
    case "parar":
      return resumen(parar(necesitaId(), quien, texto(op.nota)));
    case "reanudar":
      return resumen(reanudar(necesitaId()));
    case "pausas": {
      if (!pos[2]) throw new Error("Falta el valor: clave, nunca, cada-fase o 1,4");
      cambiarPausas(necesitaId(), pos[2]);
      return resumen(await avanzar(necesitaId(), motor));
    }
    case "url":
      if (!pos[2]) throw new Error("Falta la URL.");
      return resumen(cambiarUrl(necesitaId(), pos[2]));
    case "dominios": {
      const nombres = pos.slice(1);
      if (!nombres.length) throw new Error('Pasa uno o más nombres: pipeline dominios "Corsivo" "Lucciola"');
      return console.log(resumenChequeo(await chequear(nombres)));
    }
    case "auditar": {
      if (!id) throw new Error("Pasa la URL: pipeline auditar https://...");
      console.log(`Auditando ${id} (toma un minuto)...`);
      return console.log(resumenAuditoria(await auditar(id)));
    }
    case "seguir":
      return resumen(await avanzar(necesitaId(), motor));
    default:
      console.log(AYUDA);
  }
}

main().catch((e: Error) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
