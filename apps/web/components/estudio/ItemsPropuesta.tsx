"use client";

// Las líneas de precio de la propuesta: se agregan, se quitan y el total se ve al momento.
import { useState } from "react";

type Item = { concepto: string; detalle: string; precio: number };
const campo = "min-h-11 w-full rounded-xl bg-[#f6f3ee] px-3 text-[14px] outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#1a1816]";

export function ItemsPropuesta({ inicial, enHoras }: { inicial: Item[]; enHoras: boolean }) {
  const [items, setItems] = useState<Item[]>(inicial.length ? inicial : [{ concepto: "", detalle: "", precio: 0 }]);
  const total = items.reduce((s, x) => s + (Number(x.precio) || 0), 0);
  const cambiar = (i: number, k: keyof Item, v: string) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: k === "precio" ? Number(v.replace(/[^0-9.]/g, "")) || 0 : v } : x)));
  return (
    <div className="grid gap-2">
      {enHoras && <p className="rounded-xl bg-[#fff4e8] px-3 py-2 text-[13px] text-[#8a3a0c]">Sin tarifa todavía: los números son horas. Pon tu tarifa en Números o escribe aquí los precios en dólares.</p>}
      {items.map((x, i) => (
        <div key={i} className="grid gap-2 rounded-[14px] bg-[#faf8f4] p-3 sm:grid-cols-[1.1fr_1.6fr_120px_auto] sm:items-center">
          <input name="concepto" aria-label="Concepto" value={x.concepto} onChange={(e) => cambiar(i, "concepto", e.target.value)} placeholder="Concepto" className={`${campo} font-medium`} />
          <input name="detalle" aria-label="Detalle" value={x.detalle} onChange={(e) => cambiar(i, "detalle", e.target.value)} placeholder="Qué incluye" className={campo} />
          <label className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-suave">$</span>
            <input name="precio" aria-label="Precio" inputMode="decimal" value={x.precio || ""} onChange={(e) => cambiar(i, "precio", e.target.value)} placeholder="0" className={`${campo} pl-6 text-right tabular-nums`} />
          </label>
          <button type="button" aria-label="Quitar línea" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className="h-11 w-11 rounded-xl text-[16px] text-suave hover:bg-[#fde8e4] hover:text-[#a3260f]">×</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button type="button" onClick={() => setItems((xs) => [...xs, { concepto: "", detalle: "", precio: 0 }])} className="inline-flex min-h-9 items-center rounded-full bg-[#f1ede6] px-3 text-[13px] text-medio hover:bg-[#e9e3d9] hover:text-tinta">+ Agregar línea</button>
        <p className="text-[15px]">Total <span className="ml-2 font-serif text-[30px] tabular-nums">${total.toLocaleString("es-EC")}</span></p>
      </div>
    </div>
  );
}
