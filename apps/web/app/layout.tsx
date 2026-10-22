import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/big-shoulders-display";
import "./globals.css";
import { LienzoDiferido } from "@/components/escena/LienzoDiferido";
import { Encabezado, Pie } from "@/components/ui/Encabezado";
import { Suave } from "@/components/ui/Suave";
import { Saltar } from "@/components/ui/Saltar";
import { Movimiento } from "@/components/ui/Movimiento";
import { Despertar } from "@/components/ui/Despertar";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.ANONYMO_URL ?? "http://localhost:3000"),
  twitter: { card: "summary_large_image" },
  openGraph: { siteName: "Anonymo", locale: "es_EC", type: "website" },
  title: "Anonymo — trabajamos mientras duermes",
  description: "Agencia creativa de Jay y Luna, con un equipo de 22 agentes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Movimiento>
          <Saltar />
          <Despertar />
          <Encabezado />
          <div id="contenido" tabIndex={-1} className="outline-none">{children}</div>
          <Pie />
        </Movimiento>
        <LienzoDiferido />
        <Suave />
      </body>
    </html>
  );
}
