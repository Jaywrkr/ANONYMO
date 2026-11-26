// Qué tipo de cuenta es (sistema/121). Archivo aparte porque también lo usa la pantalla (el navegador).
export type EnfoqueCuenta = "portafolio" | "conversacion" | "mixto";
export const ENFOQUES: Record<EnfoqueCuenta, string> = { portafolio: "Muestra su trabajo", conversacion: "Conversa y enseña", mixto: "Trabajo y conversación" };
