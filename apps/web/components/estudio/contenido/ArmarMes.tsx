"use client";

// Pedirle a Faro el mes de un cliente (sistema/96). Usa IA, así que pregunta antes; si al cliente le falta algo, lo dice.
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ClienteMes { id: string; nombre: string; falta: string; enlace?: string }

const campo = "min-h-11 w-full rounded-xl bg-hueso/60 px-3 text-[15px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]";

export function ArmarMes({ clientes, meses, inicial, pedidoInicial = "" }: { clientes: ClienteMes[]; meses: { valor: string; nombre: string }[]; inicial?: string; pedidoInicial?: string }) {
  const router = useRouter();
  const [cliente, setCliente] = useState(inicial && clientes.some((c) => c.id === inicial) ? inicial : clientes.find((c) => !c.falta)?.id ?? clientes[0]?.id ?? "");
  const [mes, setMes] = useState(meses[0]?.valor ?? "");
  const [pedido, setPedido] = useState(pedidoInicial.slice(0, 800));
  const [confirmar, setConfirmar] = useState(false);
  const [trabajo, setTrabajo] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ficha?: string } | null>(null);
  const elegido = clientes.find((c) => c.id === cliente);
  const nombreMes = meses.find((m) => m.valor === mes)?.nombre ?? mes;

  async function armar() {
    setConfirmar(false);
    setTrabajo(true);
    setAviso(null);
    try {
      const r = await fetch("/estudio/contenido/armar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cliente, mes, pedido }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; ficha?: string; mes?: { id: string } };
      if (!r.ok || !j.mes) { setAviso({ texto: j.error ?? "Faro no pudo armar el mes. Vuelve a intentar.", ficha: j.ficha }); return; }
      router.push(`/estudio/contenido/${j.mes.id}`);
    } catch {
      setAviso({ texto: "Se cortó la conexión. Vuelve a intentar." });
    } finally {
      setTrabajo(false);
    }
  }

  if (!clientes.length) return <p className="text-[14px] text-medio">Todavía no hay clientes con ficha. Crea uno en Clientes y vuelve aquí.</p>;
  return (
    <form data-armar-mes onSubmit={(e) => { e.preventDefault(); if (!trabajo && !elegido?.falta) setConfirmar(true); }} className="grid gap-4 rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] text-medio">Cliente
          <select value={cliente} onChange={(e) => { setCliente(e.target.value); setAviso(null); }} disabled={trabajo} className={campo}>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.falta ? " (le faltan datos)" : ""}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[13px] text-medio">Mes
          <select value={mes} onChange={(e) => setMes(e.target.value)} disabled={trabajo} className={campo}>
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-[13px] text-medio">Algo especial este mes (opcional)
        <textarea value={pedido} onChange={(e) => setPedido(e.target.value.slice(0, 800))} disabled={trabajo} rows={2} placeholder="Ej.: lanzamos un servicio nuevo el 15; hay feriado el 25." className={`${campo} py-2.5`} />
      </label>
      {elegido?.falta && (
        <p data-falta-mes className="rounded-2xl bg-[#fff1ea] p-3 text-[14px] text-[#8a2f08]">{elegido.falta} <a href={elegido.enlace ?? `/estudio/cliente/${elegido.id}#saber`} className="underline">{elegido.enlace ? "Ir a Clientes" : "Completar su ficha"}</a></p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={trabajo || !!elegido?.falta} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[14px] text-white disabled:opacity-40">{trabajo ? "Faro está armando el mes…" : "Armar el mes"}</button>
        <p role="status" className="text-[13px] text-medio">{trabajo ? "Tarda menos de un minuto. No cierres la página." : ""}</p>
      </div>
      {aviso && <p role="alert" className="text-[14px] text-[#a33a0b]">{aviso.texto}{aviso.ficha ? <> <a href={aviso.ficha} className="underline">Ver la ficha</a></> : null}</p>}
      {confirmar && (
        <div role="alertdialog" aria-label="Confirmar" className="rounded-2xl bg-hueso p-4 text-[14px]">
          <p>Faro va a armar {nombreMes} de {elegido?.nombre}. Usa IA: unos centavos del saldo. ¿Lo hago?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void armar()} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white">Sí, armarlo</button>
            <button type="button" onClick={() => setConfirmar(false)} className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)]">Todavía no</button>
          </div>
        </div>
      )}
    </form>
  );
}
