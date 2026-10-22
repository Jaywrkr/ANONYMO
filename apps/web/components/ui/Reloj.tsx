"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { idiomaDeRuta } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { useModoNoche } from "@/lib/noche";

function horaCuenca() {
  const d = new Date();
  const hm = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const h = Number(hm.slice(0, 2));
  return { hm, noche: h >= 21 || h < 7 };
}

/** Hace literal "trabajamos mientras duermes": la hora real de Cuenca decide quién está al mando. */
export function Reloj({ modo = "linea" }: { modo?: "linea" | "corto" }) {
  const [t, setT] = useState<{ hm: string; noche: boolean } | null>(null);
  const tx = T[idiomaDeRuta(usePathname())].reloj;
  const luz = useModoNoche();
  useEffect(() => {
    const tic = () => {
      const h = horaCuenca();
      setT(h);
      // De noche, el inicio se apaga: los humanos duermen, los agentes trabajan. O lo eliges tú.
      const noche = luz === "auto" ? h.noche : luz === "noche";
      document.documentElement.dataset.noche = noche ? "1" : "0";
    };
    tic();
    const id = setInterval(tic, 30_000);
    return () => clearInterval(id);
  }, [luz]);
  if (!t) return <span>Cuenca, Ecuador</span>;
  if (modo === "corto") return <span>Cuenca · {t.hm}</span>;
  return (
    <span>
      {t.hm} {tx.en} {t.noche ? tx.noche : tx.dia}
    </span>
  );
}
