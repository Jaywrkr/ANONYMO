"use client";

import dynamic from "next/dynamic";

export const CumuloDiferido = dynamic(() => import("./Cumulo").then((m) => m.Cumulo), { ssr: false });
