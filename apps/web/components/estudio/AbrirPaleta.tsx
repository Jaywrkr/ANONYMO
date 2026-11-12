"use client";
// Botón que abre la paleta de Ctrl K (sistema/77), para quien no usa el teclado.
export function AbrirPaleta({ className, children }: { className?: string; children: React.ReactNode }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("anonymo:paleta"))}>{children}</button>;
}
