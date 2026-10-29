"use client";

// Confirmación antes de algo que no se deshace fácil (sistema/31). Abre un cuadro; si se pide, hay que escribir una palabra.
import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function Boton({ texto, peligro, deshabilitado }: { texto: string; peligro?: boolean; deshabilitado?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || deshabilitado}
      className={`inline-flex min-h-11 items-center rounded-full px-5 font-mono text-[12px] uppercase tracking-[0.12em] disabled:opacity-40 ${peligro ? "bg-[#8a1c0c] text-white" : "bg-tinta text-hueso"}`}
    >
      {pending ? "Un momento…" : texto}
    </button>
  );
}

export function Confirmar({
  accion,
  campos,
  disparador,
  claseDisparador,
  titulo,
  texto,
  confirmar = "Confirmar",
  palabra,
  peligro,
}: {
  accion: (f: FormData) => void | Promise<void>;
  campos: Record<string, string>;
  disparador: string;
  claseDisparador?: string;
  titulo: string;
  texto: string;
  confirmar?: string;
  /** Si viene, hay que escribirla tal cual para poder confirmar. */
  palabra?: string;
  peligro?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [escrito, setEscrito] = useState("");
  const idTitulo = useId();
  const coincide = !palabra || escrito.trim().toLowerCase() === palabra.trim().toLowerCase();
  return (
    <>
      <button
        type="button"
        onClick={() => { setEscrito(""); dialogo.current?.showModal(); }}
        className={claseDisparador ?? "inline-flex min-h-11 items-center font-mono text-[12px] uppercase tracking-[0.12em] text-gris underline underline-offset-4"}
      >
        {disparador}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        className="m-auto w-[min(460px,calc(100%-32px))] rounded-3xl border border-linea bg-hueso p-0 text-tinta shadow-2xl backdrop:bg-tinta/40 backdrop:backdrop-blur-sm"
        onClick={(e) => { if (e.target === dialogo.current) dialogo.current?.close(); }}
      >
        <form action={accion} className="grid gap-4 p-6">
          {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <p id={idTitulo} className="display text-[34px] leading-none">{titulo}</p>
          <p className="text-[15px] text-gris">{texto}</p>
          {palabra && (
            <label className="grid gap-1 text-[14px]">
              Escribe <strong>«{palabra}»</strong> para confirmar
              <input name="confirmar" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" className="w-full rounded-2xl border border-linea bg-papel p-3 text-[15px] outline-none focus:border-tinta" />
            </label>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={() => dialogo.current?.close()} className="inline-flex min-h-11 items-center rounded-full border border-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em]">Cancelar</button>
            <Boton texto={confirmar} peligro={peligro} deshabilitado={!coincide} />
          </div>
        </form>
      </dialog>
    </>
  );
}
