# Las 40 mejoras

Una rama por mejora, en cadena (cada una sale de la anterior). Estado y cómo se usa cada una.

## Sistema

| Rama | Qué hace | Cómo se usa |
|---|---|---|
| sistema/01-panel-web | Panel del estudio: proyectos, aprobar, cambiar, parar, pausas, bitácora | `npm run dev` → `/estudio` (o `ESTUDIO=1 npm run start`) |
| sistema/02-portal-cliente | Enlace privado del cliente: ve sus entregas (sin las internas), aprueba fases y comenta | Estudio → "Crear enlace", o `npm run pipeline -- portal <id>`; necesita `PORTAL=1` o `ESTUDIO=1` |
| sistema/03-comentarios-desde-panel | Escribir lo que dijo el cliente (o traer lo que comentó en su portal), ver a quién lo manda Atlas, ajustar agentes y mandarlo | Estudio → proyecto → "Lo que dijo el cliente" |
| sistema/04-comparar-versiones | Cada entrega guarda sus versiones anteriores; en el estudio se ven y se comparan línea por línea | Estudio → entrega → "Versiones" / "comparar" |
| sistema/05-volver-version | Volver a una versión anterior de una entrega (queda como versión nueva) y avisa qué conviene revisar | Estudio → entrega → ver una versión → "Volver a esta versión", o `pipeline volver <id> 3-mira 1` |
