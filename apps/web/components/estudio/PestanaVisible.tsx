"use client";

// En celular todas las pestañas del proyecto están en una fila que se desliza (sistema/69): ninguna queda escondida
// en «Más opciones». Al llegar, la pestaña donde estás se acomoda a la vista aunque esté al final de la fila.
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function PestanaVisible() {
  const params = useSearchParams();
  useEffect(() => {
    const fila = document.getElementById("pestanas-proyecto");
    const actual = fila?.querySelector<HTMLElement>("[aria-current=page]");
    if (!fila || !actual) return;
    const izquierda = actual.offsetLeft - (fila.clientWidth - actual.offsetWidth) / 2;
    fila.scrollTo({ left: Math.max(0, izquierda), behavior: "instant" as ScrollBehavior });
  }, [params]);
  return null;
}
