"use client";
// «Ajustar el plan» al lado de «Que empiecen» (sistema/111): abre la caja del ajuste ahí mismo y pone el cursor.
export function AbrirAjuste({ className }: { className: string }) {
  return (
    <button type="button" className={className} onClick={() => {
      const d = document.getElementById("ajustar") as HTMLDetailsElement | null;
      if (!d) return;
      d.open = !d.open;
      if (d.open) requestAnimationFrame(() => document.getElementById("ajuste")?.focus());
    }}>Ajustar el plan</button>
  );
}
