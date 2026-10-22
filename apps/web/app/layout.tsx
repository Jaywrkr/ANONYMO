import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/big-shoulders-display";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANONYMO",
  description: "Agencia creativa de Jay y Luna, con un equipo de 22 agentes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
