export interface ServicioAgencia {id:string;nombre:string;entregas:string[];condiciones:string[];capacidad:'texto'|'web'|'vector'|'video'|'audio'|'fisico';}
export const SERVICIOS:ServicioAgencia[]=[
 {id:'estrategia',nombre:'Estrategia de marca',capacidad:'texto',entregas:['Posicionamiento','Público y propuesta','Decisiones de marca'],condiciones:['Fuentes identificadas','Diferenciación argumentada','Decisiones aplicables al negocio']},
 {id:'naming',nombre:'Naming',capacidad:'texto',entregas:['Finalistas','Argumentos','Comprobaciones y riesgos'],condiciones:['Pronunciación comprobada','Similitudes investigadas','Disponibilidad y revisión legal distinguidas']},
 {id:'identidad',nombre:'Logo e identidad',capacidad:'vector',entregas:['SVG editable','Versiones monocromáticas','Aplicaciones','Manual'],condiciones:['Archivo vectorial real','Legibilidad pequeña','Reproducción en una tinta','Licencias documentadas']},
 {id:'web',nombre:'Web',capacidad:'web',entregas:['Sitio navegable','Contenido','Archivos y configuración'],condiciones:['Celular y escritorio','Funciones probadas','Accesibilidad y rendimiento','Idiomas del pedido']},
 {id:'textos',nombre:'Textos',capacidad:'texto',entregas:['Textos por medio','Variantes necesarias','Fuentes'],condiciones:['Datos sustentados','Voz coherente','Claridad y utilidad']},
 {id:'campana',nombre:'Campañas y redes',capacidad:'vector',entregas:['Concepto','Piezas por formato','Textos','Calendario'],condiciones:['Objetivo medible','Formatos finales','Marca coherente','Permiso de publicación']},
 {id:'presentacion',nombre:'Presentaciones',capacidad:'vector',entregas:['Archivo editable','PDF','Recursos'],condiciones:['Cifras verificadas','Narrativa clara','Lectura en presentación']},
 {id:'foto',nombre:'Fotografía',capacidad:'fisico',entregas:['Plan de sesión','Selección','Imágenes finales'],condiciones:['Sesión y proveedor confirmados','Derechos de uso','Calidad en tamaños finales']},
 {id:'video',nombre:'Video y movimiento',capacidad:'video',entregas:['Guion','Storyboard','Video reproducible','Versiones'],condiciones:['Archivo final reproducible','Audio e imagen revisados','Licencias','Formatos de destino']},
 {id:'audio',nombre:'Identidad sonora',capacidad:'audio',entregas:['Audio maestro','Variantes','Licencias'],condiciones:['Audio reproducible','Niveles adecuados','Derechos documentados']},
 {id:'packaging',nombre:'Packaging e impresión',capacidad:'fisico',entregas:['Artes editables','Archivos de producción'],condiciones:['Troquel del proveedor','Sangrados y medidas','Materiales y prueba de impresión']},
 {id:'mantenimiento',nombre:'Mantenimiento y crecimiento',capacidad:'web',entregas:['Comprobaciones','Mejoras','Informe de resultados'],condiciones:['Versión identificada','Métricas comprobables','Presupuesto y alcance vigentes']},
];
export function capacidadesAgencia(){return SERVICIOS.map(s=>({...s,estado:s.capacidad==='texto'||s.capacidad==='web'||s.id==='identidad'?'Producción y revisión disponibles; requiere validar el caso real':'Requiere conectar y validar la producción del archivo final'}));}
