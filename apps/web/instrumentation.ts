// Lo que se prepara una vez al arrancar el servidor (sistema/91).
// Los avisos de gasto en IA (50, 80 y 100 % del tope) van al celular de Jay y Luna.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ alAvisarGasto }, { avisarCelulares }] = await Promise.all([import("@anonymo/pipeline/src/gasto.ts"), import("@/lib/avisos-celular")]);
  alAvisarGasto(async (a) => {
    const usd = (n: number) => `USD ${n.toFixed(2)}`;
    const de = a.alcance === "dia" ? "de hoy" : "del mes";
    await avisarCelulares({
      titulo: a.nivel >= 100 ? `Gasto en IA: se llegó al tope ${de}` : `Gasto en IA: ${a.nivel} % del tope ${de}`,
      texto: `${usd(a.gastado)} de ${usd(a.tope)}.${a.nivel >= 100 ? " El trabajo automático se detuvo." : ""}`,
      url: "/estudio/gasto",
    });
  });
}
