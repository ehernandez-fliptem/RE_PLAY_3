import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

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

export interface IBloqueCapacitacion {
    id: string;
    tipo: TipoBloqueCapacitacion;
    orden: number;
    titulo?: string;
    contenido?: any;
    configuracion?: any;
    reglas?: any;
    estilos?: any;
}

export interface IPasoCapacitacion {
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
    bloques: IBloqueCapacitacion[];
}

export interface ICapacitacion extends Document {
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
    pasos: IPasoCapacitacion[];
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const bloqueSchema = new Schema<IBloqueCapacitacion>(
    {
        id: { type: String, required: true },
        tipo: {
            type: String,
            enum: [
                "texto",
                "imagen",
                "video",
                "link",
                "checklist",
                "tarjetas",
                "acordeon",
                "pregunta",
                "separador",
                "documento",
                "aviso",
            ],
            required: true,
        },
        orden: { type: Number, default: 1 },
        titulo: { type: String, default: "" },
        contenido: { type: Schema.Types.Mixed, default: {} },
        configuracion: { type: Schema.Types.Mixed, default: {} },
        reglas: { type: Schema.Types.Mixed, default: {} },
        estilos: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false }
);

const pasoSchema = new Schema<IPasoCapacitacion>(
    {
        id: { type: String, required: true },
        titulo: { type: String, required: [true, "El titulo del paso es obligatorio."] },
        descripcion: { type: String, default: "" },
        orden: { type: Number, default: 1 },
        tiempo_minimo_segundos: { type: Number, default: 0 },
        confirmacion_requerida: { type: Boolean, default: false },
        reglas_avance: {
            requiere_ver_todos_los_bloques: { type: Boolean, default: false },
            requiere_tiempo_minimo: { type: Boolean, default: false },
            requiere_checklist: { type: Boolean, default: false },
            requiere_preguntas: { type: Boolean, default: false },
            requiere_respuestas_correctas: { type: Boolean, default: false },
            requiere_abrir_interactivos: { type: Boolean, default: false },
            requiere_video_completo: { type: Boolean, default: false },
            requiere_abrir_links: { type: Boolean, default: false },
        },
        bloques: { type: [bloqueSchema], default: [] },
    },
    { _id: false }
);

const capacitacionSchema = new Schema<ICapacitacion>({
    titulo: { type: String, required: [true, "El titulo es obligatorio."] },
    descripcion: { type: String, default: "" },
    slug: {
        type: String,
        required: [true, "El slug es obligatorio."],
        unique: true,
        uniqueCaseInsensitive: true,
    },
    estado: {
        type: String,
        enum: ["borrador", "publicada", "inactiva"],
        default: "borrador",
    },
    color_principal: { type: String, default: "#6d00f5" },
    logo_url: { type: String, default: "" },
    portada_url: { type: String, default: "" },
    configuracion: {
        mostrar_barra_progreso: { type: Boolean, default: true },
        mostrar_numero_paso: { type: Boolean, default: true },
        estilo_navegacion: { type: String, default: "botones" },
        layout: { type: String, default: "tarjeta" },
        fondo: { type: String, default: "claro" },
        requerir_identificacion: { type: Boolean, default: false },
        campos_identificacion: {
            nombre: { type: Boolean, default: true },
            correo: { type: Boolean, default: false },
            empresa: { type: Boolean, default: false },
            numero_empleado: { type: Boolean, default: false },
        },
        permitir_anonimo: { type: Boolean, default: true },
    },
    pasos: { type: [pasoSchema], default: [] },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    activo: { type: Boolean, default: true },
});

capacitacionSchema.pre<ICapacitacion>("save", function (next) {
    this.titulo = String(this.titulo || "").trim();
    this.descripcion = String(this.descripcion || "").trim();
    this.slug = String(this.slug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    this.fecha_modificacion = new Date();
    next();
});

capacitacionSchema.plugin(uniqueValidator, {
    type: "mongoose-unique-validator",
    message: "El {PATH} `{VALUE}` ya esta registrado.",
});

const Capacitaciones: Model<ICapacitacion> = mongoose.model<ICapacitacion>("capacitaciones", capacitacionSchema);

export default Capacitaciones;
