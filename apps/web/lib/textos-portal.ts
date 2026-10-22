// Textos del portal del cliente en español e inglés (sistema/20).
export const TEXTOS_PORTAL = {
  es: {
    tuProyecto: "Tu proyecto con Jay y Luna", fechas: "Fechas", listas: (a: number, b: number, f?: string) => `${a} de ${b} entregas listas · fase ${f ?? ""}`,
    terminamos: (f?: string) => `Terminamos ${f ?? ""}`, revisa: "Revisa lo que entregó el equipo. Si está bien, apruébala y seguimos. Si algo no te convence, déjanos un comentario abajo.",
    aprobar: (f?: string) => `Aprobar ${f ?? ""}`, antes: "Antes de seguir, cuéntanos", antesDetalle: "Responde lo que sepas. Lo que dejes en blanco te lo preguntamos después.",
    enviarResp: "Enviar respuestas", enCamino: "en camino", comentario: "Tu comentario", comentarioEj: "Ej.: me gusta, pero la quiero más elegante", enviarCom: "Enviar comentario",
    archivos: "Fotos, logos o documentos", enviarArch: "Enviar archivos", elige: "Elige una entrega para leerla completa.",
  },
  en: {
    tuProyecto: "Your project with Jay & Luna", fechas: "Timeline", listas: (a: number, b: number, f?: string) => `${a} of ${b} deliverables ready · phase ${f ?? ""}`,
    terminamos: (f?: string) => `We finished ${f ?? ""}`, revisa: "Take a look at what the team delivered. If it works for you, approve it and we move on. If something doesn't, leave us a comment below.",
    aprobar: (f?: string) => `Approve ${f ?? ""}`, antes: "Before we continue, tell us", antesDetalle: "Answer what you can. We'll ask about anything you leave blank later.",
    enviarResp: "Send answers", enCamino: "in progress", comentario: "Your comment", comentarioEj: "E.g.: I like it, but I want it more elegant", enviarCom: "Send comment",
    archivos: "Photos, logos or documents", enviarArch: "Send files", elige: "Pick a deliverable to read it in full.",
  },
};
