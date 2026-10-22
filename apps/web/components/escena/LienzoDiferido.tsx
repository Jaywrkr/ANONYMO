"use client";

import dynamic from "next/dynamic";

// three.js y el lienzo llegan en su propio paquete, después del contenido.
export const LienzoDiferido = dynamic(() => import("./Lienzo").then((m) => m.Lienzo), { ssr: false });
