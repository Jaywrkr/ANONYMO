import { Suspense } from "react";
import { Avisos } from "@/components/estudio/Avisos";

// Todo el estudio comparte los avisos flotantes con el resultado de cada acción.
export default function LayoutEstudio({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}><Avisos /></Suspense>
    </>
  );
}
