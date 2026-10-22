# Las 40 mejoras

Una rama por mejora, en cadena (cada una sale de la anterior). Estado y cómo se usa cada una.

## Sistema

| Rama | Qué hace | Cómo se usa |
|---|---|---|
| sistema/01-panel-web | Panel del estudio: proyectos, aprobar, cambiar, parar, pausas, bitácora | `npm run dev` → `/estudio` (o `ESTUDIO=1 npm run start`) |
| sistema/02-portal-cliente | Enlace privado del cliente: ve sus entregas (sin las internas), aprueba fases y comenta | Estudio → "Crear enlace", o `npm run pipeline -- portal <id>`; necesita `PORTAL=1` o `ESTUDIO=1` |
