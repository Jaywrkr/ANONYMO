"use client";

// Confirmación antes de algo que no se deshace fácil (sistema/31). Abre un cuadro; si se pide, hay que escribir una palabra.
import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function Boton({ texto, peligro, deshabilitado }: { texto: string; peligro?: boolean; deshabilitado?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || deshabilitado}
      className={`inline-flex min-h-11 items-center rounded-full px-5 text-[13px] font-medium text-white transition disabled:opacity-40 ${peligro ? "bg-[#b3260f] hover:bg-[#93200c]" : "bg-tinta hover:bg-black"}`}
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
        className={claseDisparador ?? "inline-flex min-h-11 items-center rounded-full px-3 text-[13px] text-medio underline-offset-4 transition hover:text-tinta hover:underline"}
      >
        {disparador}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        className="dialogo m-auto w-[min(460px,calc(100%-32px))] rounded-[22px] bg-carta p-0 text-tinta shadow-[0_0_0_1px_rgba(26,24,22,.06),0_30px_80px_-20px_rgba(20,15,10,.45)] backdrop:bg-tinta/35 backdrop:backdrop-blur-sm"
        onClick={(e) => { if (e.target === dialogo.current) dialogo.current?.close(); }}
      >
        <form action={accion} className="grid gap-4 p-6">
          {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <p id={idTitulo} className="font-serif text-[32px] leading-[1.02]">{titulo}</p>
          <p className="text-[15px] leading-relaxed text-medio">{texto}</p>
          {palabra && (
            <label className="grid gap-1 text-[14px]">
              Escribe <strong>«{palabra}»</strong> para confirmar
              <input name="confirmar" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" autoFocus className="w-full rounded-xl bg-white px-3.5 py-3 text-[15px] shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)]" />
            </label>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={() => dialogo.current?.close()} className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_#cbc3b6]">Cancelar</button>
            <Boton texto={confirmar} peligro={peligro} deshabilitado={!coincide} />
          </div>
        </form>
      </dialog>
    </>
  );
}
