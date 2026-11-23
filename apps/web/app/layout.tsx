import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
// La usa una de las muestras para prospectos (no es parte de la marca).
import "@fontsource-variable/big-shoulders-display";
import "./globals.css";
import { Encabezado, Pie } from "@/components/ui/Encabezado";
import { Suave } from "@/components/ui/Suave";
import { Saltar } from "@/components/ui/Saltar";
import { Movimiento } from "@/components/ui/Movimiento";
import { Despertar } from "@/components/ui/Despertar";
import { Medicion } from "@/components/ui/Medicion";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.ANONYMO_URL ?? "http://localhost:3000"),
  twitter: { card: "summary_large_image" },
  openGraph: { siteName: "Unmake", locale: "es_EC", type: "website" },
  title: "Unmake — estudio de diseño, tecnología y comunicación",
  description: "Diseño, tecnología y comunicación, hechos por dos personas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <body>
        <Movimiento>
          <Saltar />
          <Despertar />
          <Medicion />
          <Encabezado />
          <div id="contenido" tabIndex={-1} className="outline-none">{children}</div>
          <Pie />
        </Movimiento>
        <Suave />
      </body>
    </html>
  );
}
