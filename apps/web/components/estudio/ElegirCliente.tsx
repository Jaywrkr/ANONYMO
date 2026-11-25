"use client";

// Paso 1 del pedido (sistema/109): para quién es. Siempre se elige de la lista (fichas y clientes nuevos de Imán)
// o se crea uno a la vista. Nunca se escribe el nombre suelto, así no aparecen fichas repetidas.
// Si Atlas ve el nombre de un cliente en el texto, solo lo propone: se confirma con un toque.
import { useEffect, useMemo, useRef, useState } from "react";
import { clientesDe } from "@anonymo/pipeline/src/clientes/caja.ts";

export interface OpcionCliente { id: string; nombre: string; alias?: string[]; prospecto?: string; detalle: string; /** Lo que su ficha ya sabe (claves de saber). */ sabe?: string[] }

type Elegido = { tipo: "ficha"; c: OpcionCliente } | { tipo: "nuevo"; nombre: string };

// El mismo id que usa el servidor para la ficha («Clínica Sonrisa» → «clinica-sonrisa»).
const slug = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente";
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ¿El texto nombra a un solo cliente? Por su nombre entero o un alias (como lo hace Atlas). */
function nombrado(texto: string, clientes: OpcionCliente[]): OpcionCliente | undefined {
  const t = normal(texto);
  if (t.length < 8) return;
  const hay = clientes.filter((c) => [c.nombre, ...(c.alias ?? [])].some((n) => n.length > 3 && t.includes(normal(n))));
  return hay.length === 1 ? hay[0] : undefined;
}

export function ElegirCliente({ clientes, inicial }: { clientes: OpcionCliente[]; inicial?: { ficha?: string; cliente?: string; prospecto?: string } }) {
  const desdeInicio = (): Elegido | undefined => {
    const c = clientes.find((x) => x.id === inicial?.ficha) ?? (inicial?.cliente ? clientesDe(inicial.cliente, clientes).find((x) => slug(x.nombre) === slug(inicial.cliente!)) : undefined);
    if (c) return { tipo: "ficha", c: inicial?.prospecto && !c.prospecto ? { ...c, prospecto: inicial.prospecto } : c };
    if (inicial?.cliente?.trim()) return { tipo: "nuevo", nombre: inicial.cliente.trim().slice(0, 80) };
  };
  const [elegido, setElegido] = useState<Elegido | undefined>(desdeInicio);
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [propuesto, setPropuesto] = useState<OpcionCliente>();
  const [descartado, setDescartado] = useState<string>();
  const caja = useRef<HTMLInputElement>(null);

  // Atlas mira el texto del pedido: si nombra a un cliente, lo propone (no lo elige solo).
  useEffect(() => {
    const area = document.querySelector<HTMLTextAreaElement>('textarea[name="texto"]');
    if (!area) return;
    const mirar = () => setPropuesto(nombrado(area.value, clientes));
    mirar();
    area.addEventListener("input", mirar);
    return () => area.removeEventListener("input", mirar);
  }, [clientes]);

  // Avisa a la caja del pedido qué sabe ya la ficha del elegido (sistema/111): sus pistas se marcan solas.
  useEffect(() => {
    const sabe = elegido?.tipo === "ficha" ? elegido.c.sabe ?? [] : [];
    // Queda también a mano por si la caja todavía no escuchaba (los dos montan a la vez).
    (window as unknown as { __pedidoSabe?: string[] }).__pedidoSabe = sabe;
    window.dispatchEvent(new CustomEvent("pedido:cliente", { detail: { sabe } }));
  }, [elegido]);

  const lista = useMemo(() => {
    const q = buscar.trim();
    const base = q ? clientesDe(q, clientes) : clientes.filter((c) => !c.prospecto);
    return base.slice(0, 7);
  }, [buscar, clientes]);
  const exacto = lista.some((c) => slug(c.nombre) === slug(buscar));
  const opciones: ({ tipo: "ficha"; c: OpcionCliente } | { tipo: "nuevo"; nombre: string })[] = [
    ...lista.map((c) => ({ tipo: "ficha" as const, c })),
    ...(buscar.trim().length >= 2 && !exacto ? [{ tipo: "nuevo" as const, nombre: buscar.trim().slice(0, 80) }] : []),
  ];

  const elegir = (e: Elegido) => { setElegido(e); setAbierto(false); setBuscar(""); };
  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, opciones.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const o = opciones[activo]; if (o) elegir(o); }
    else if (e.key === "Escape") setAbierto(false);
  };

  const sugerir = propuesto && !elegido && descartado !== propuesto.id;

  return (
    <div className="grid gap-2" data-elegir-cliente>
      <span className="text-[13px] font-medium" id="para-quien">¿Para quién?</span>
      {/* Lo que lee el servidor: la ficha elegida, su nombre y, si viene de Imán, el prospecto. */}
      <input type="hidden" name="cliente" value={elegido ? (elegido.tipo === "ficha" ? elegido.c.nombre : elegido.nombre) : ""} />
      <input type="hidden" name="ficha" value={elegido?.tipo === "ficha" ? elegido.c.id : elegido ? slug(elegido.nombre) : ""} />
      <input type="hidden" name="prospecto" value={elegido?.tipo === "ficha" ? elegido.c.prospecto ?? "" : ""} />
      <input type="hidden" name="clienteNuevo" value={elegido?.tipo === "nuevo" ? "1" : ""} />

      {elegido ? (
        <div className="flex items-center gap-3 rounded-[14px] bg-white p-3 pl-4 shadow-[0_0_0_1.5px_var(--color-tinta)]" data-cliente-elegido>
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tinta text-[14px] font-medium text-white">{(elegido.tipo === "ficha" ? elegido.c.nombre : elegido.nombre).slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-medium">{elegido.tipo === "ficha" ? elegido.c.nombre : elegido.nombre}</p>
            <p className="text-[12px] text-medio">{elegido.tipo === "ficha" ? elegido.c.detalle : "Cliente nuevo · se crea su ficha"}</p>
          </div>
          <button type="button" onClick={() => { setElegido(undefined); requestAnimationFrame(() => caja.current?.focus()); }} className="min-h-11 rounded-full px-4 text-[13px] text-medio hover:bg-[#f4f1eb] hover:text-tinta">Cambiar</button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={caja}
            role="combobox"
            autoFocus={!inicial?.ficha && !inicial?.cliente}
            aria-labelledby="para-quien"
            aria-expanded={abierto}
            aria-controls="lista-clientes"
            aria-autocomplete="list"
            autoComplete="off"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setAbierto(true); setActivo(0); }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            onKeyDown={tecla}
            placeholder="Busca el cliente o escribe uno nuevo"
            className="h-12 w-full rounded-[14px] bg-white px-4 text-[16px] shadow-[0_0_0_1px_rgba(26,24,22,.1)] outline-none focus:shadow-[0_0_0_1.5px_var(--color-tinta)]"
          />
          {abierto && opciones.length > 0 && (
            <ul id="lista-clientes" role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-auto rounded-[14px] bg-white p-1.5 shadow-[0_0_0_1px_rgba(26,24,22,.08),0_18px_40px_-16px_rgba(40,30,20,.35)]">
              {opciones.map((o, i) => (
                <li key={o.tipo === "ficha" ? o.c.id : "nuevo"} role="option" aria-selected={i === activo}
                  onMouseDown={(e) => { e.preventDefault(); elegir(o); }} onMouseEnter={() => setActivo(i)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 ${i === activo ? "bg-[#f4f1eb]" : ""} ${o.tipo === "nuevo" ? "border-t border-borde" : ""}`}>
                  {o.tipo === "ficha" ? (
                    <><span className="min-w-0 flex-1 truncate text-[15px]">{o.c.nombre}</span><span className="shrink-0 text-[12px] text-suave">{o.c.detalle}</span></>
                  ) : (
                    <><span aria-hidden className="text-[18px] leading-none">+</span><span className="text-[15px]">Cliente nuevo: <b className="font-medium">«{o.nombre}»</b></span></>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sugerir && (
        <p className="flex flex-wrap items-center gap-2 text-[13px]" data-propuesta-atlas>
          <span className="text-medio">Atlas lo leyó en el texto:</span>
          <button type="button" onClick={() => elegir({ tipo: "ficha", c: propuesto })} className="min-h-9 rounded-full bg-tinta px-4 text-white">¿Es para {propuesto.nombre}?</button>
          <button type="button" onClick={() => setDescartado(propuesto.id)} className="min-h-9 rounded-full px-3 text-medio hover:text-tinta">No</button>
        </p>
      )}
    </div>
  );
}
