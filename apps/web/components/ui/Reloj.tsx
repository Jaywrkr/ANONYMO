"use client";

import { useEffect, useState } from "react";

function horaCuenca() {
  const d = new Date();
  const hm = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const h = Number(hm.slice(0, 2));
  return { hm, noche: h >= 21 || h < 7 };
}

/** Hace literal "trabajamos mientras duermes": la hora real de Cuenca decide quién está al mando. */
export function Reloj({ modo = "linea" }: { modo?: "linea" | "corto" }) {
  const [t, setT] = useState<{ hm: string; noche: boolean } | null>(null);
  useEffect(() => {
    const tic = () => {
      const h = horaCuenca();
      setT(h);
      // De noche, el inicio se apaga: los humanos duermen, los agentes trabajan.
      document.documentElement.dataset.noche = h.noche ? "1" : "0";
    };
    tic();
    const id = setInterval(tic, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!t) return <span>Cuenca, Ecuador</span>;
  if (modo === "corto") return <span>Cuenca · {t.hm}</span>;
  return (
    <span>
      {t.hm} en Cuenca. {t.noche ? "Ellos duermen. El equipo, no." : "Jay y Luna al mando."}
    </span>
  );
}
