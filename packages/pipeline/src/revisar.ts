// Revisa que el contrato cuadre con el equipo y muestra el orden de cada tipo de pedido.
import { AGENTES, FASES, PEDIDOS, SERVICIO, type TipoPedido } from "@anonymo/agentes";
import { CONTRATOS, contratoPorId, lecturas, ordenar } from "./contratos.ts";

const errores: string[] = [];
const ids = new Set(AGENTES.map((a) => a.id));

for (const f of FASES) {
  for (const a of f.agentes) if (!contratoPorId(`${f.n}.${a}`)) errores.push(`Falta contrato para ${f.n}.${a}`);
}
for (const c of CONTRATOS) {
  if (!ids.has(c.agente)) errores.push(`${c.id}: el agente no existe`);
  if (!FASES.find((f) => f.n === c.fase)?.agentes.includes(c.agente)) errores.push(`${c.id}: el agente no está en esa fase`);
  if (c.id !== `${c.fase}.${c.agente}`) errores.push(`${c.id}: id no coincide con fase y agente`);
  if (c.usa !== "todo") for (const u of c.usa) {
    const d = contratoPorId(u);
    if (!d) errores.push(`${c.id}: usa ${u}, que no existe`);
    else if (d.fase > c.fase) errores.push(`${c.id}: usa ${u}, de una fase posterior`);
  }
  if (c.criterios.length < 2) errores.push(`${c.id}: necesita al menos dos criterios`);
}
const usados = new Set(CONTRATOS.map((c) => c.agente));
for (const a of AGENTES) if (!usados.has(a.id)) errores.push(`${a.id} no tiene ninguna tarea`);

console.log(`${CONTRATOS.length} contratos · ${usados.size} agentes · ${FASES.length} fases\n`);
for (const [tipo, p] of Object.entries(PEDIDOS) as [TipoPedido, (typeof PEDIDOS)[TipoPedido]][]) {
  const plan = ordenar(p.fases);
  console.log(`${p.nombre} (fases ${p.fases.join(", ")}): ${plan.length} tareas`);
  for (const id of plan) {
    const c = contratoPorId(id)!;
    const lee = lecturas(id, plan);
    console.log(`  ${id.padEnd(10)} ${c.entrega.padEnd(28)} ${lee.length ? "lee " + (c.usa === "todo" ? "todo lo anterior" : lee.join(", ")) : ""}`);
  }
  console.log();
}
for (const [n, s] of Object.entries(SERVICIO)) {
  const propias = CONTRATOS.filter((c) => c.fase === Number(n)).length;
  if (!propias) errores.push(`La fase ${n} no tiene tareas`);
  void s;
}

if (errores.length) {
  console.error("Errores:\n- " + errores.join("\n- "));
  process.exit(1);
}
console.log("Contrato OK.");
