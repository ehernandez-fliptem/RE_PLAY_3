export type EstadoCapacitacion = "borrador" | "publicada" | "inactiva";
export type TipoBloqueCapacitacion =
  | "texto"
  | "imagen"
  | "video"
  | "link"
  | "checklist"
  | "tarjetas"
  | "acordeon"
  | "pregunta"
  | "separador"
  | "documento"
  | "aviso";

export type BloqueCapacitacion = {
  id: string;
  tipo: TipoBloqueCapacitacion;
  orden: number;
  titulo?: string;
  contenido?: any;
  configuracion?: any;
  reglas?: any;
  estilos?: any;
};

export type PasoCapacitacion = {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  tiempo_minimo_segundos?: number;
  confirmacion_requerida?: boolean;
  reglas_avance?: {
    requiere_ver_todos_los_bloques?: boolean;
    requiere_tiempo_minimo?: boolean;
    requiere_checklist?: boolean;
    requiere_preguntas?: boolean;
    requiere_respuestas_correctas?: boolean;
    requiere_abrir_interactivos?: boolean;
    requiere_video_completo?: boolean;
    requiere_abrir_links?: boolean;
  };
  bloques: BloqueCapacitacion[];
};

export type Capacitacion = {
  _id?: string;
  titulo: string;
  descripcion?: string;
  slug: string;
  estado: EstadoCapacitacion;
  color_principal?: string;
  logo_url?: string;
  portada_url?: string;
  configuracion?: {
    mostrar_barra_progreso?: boolean;
    mostrar_numero_paso?: boolean;
    estilo_navegacion?: "botones" | "stepper";
    layout?: "centrado" | "ancho" | "tarjeta";
    fondo?: "claro" | "morado" | "imagen";
    requerir_identificacion?: boolean;
    campos_identificacion?: {
      nombre?: boolean;
      correo?: boolean;
      empresa?: boolean;
      numero_empleado?: boolean;
    };
    permitir_anonimo?: boolean;
  };
  pasos: PasoCapacitacion[];
};

export const bloqueInicial = (): BloqueCapacitacion => ({
  id: `bloque-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  tipo: "texto",
  orden: 1,
  titulo: "",
  contenido: { texto: "Escribe el contenido de este bloque." },
  configuracion: {},
  reglas: {},
  estilos: {},
});

export const pasoInicial = (): PasoCapacitacion => ({
  id: `paso-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  titulo: "Nuevo paso",
  descripcion: "",
  orden: 1,
  tiempo_minimo_segundos: 0,
  confirmacion_requerida: false,
  reglas_avance: {
    requiere_ver_todos_los_bloques: false,
    requiere_tiempo_minimo: false,
    requiere_checklist: false,
    requiere_preguntas: false,
    requiere_respuestas_correctas: false,
    requiere_abrir_interactivos: false,
    requiere_video_completo: false,
    requiere_abrir_links: false,
  },
  bloques: [bloqueInicial()],
});

export const capacitacionInicial: Capacitacion = {
  titulo: "",
  descripcion: "",
  slug: "",
  estado: "borrador",
  color_principal: "#6d00f5",
  logo_url: "",
  portada_url: "",
  configuracion: {
    mostrar_barra_progreso: true,
    mostrar_numero_paso: true,
    estilo_navegacion: "botones",
    layout: "tarjeta",
    fondo: "claro",
    requerir_identificacion: false,
    campos_identificacion: {
      nombre: true,
      correo: false,
      empresa: false,
      numero_empleado: false,
    },
    permitir_anonimo: true,
  },
  pasos: [pasoInicial()],
};

export function slugifyCapacitacion(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
