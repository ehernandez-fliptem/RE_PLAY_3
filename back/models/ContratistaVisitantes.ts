import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import { REGEX_EMAIL, REGEX_NAME, REGEX_PHONE } from "../utils/commonRegex";

export interface IContratistaVisitante extends Document {
    id_contratista: mongoose.Types.ObjectId;
    id_empresa: mongoose.Types.ObjectId;
    empresa: string;
    nombre: string;
    apellido_pat: string;
    apellido_mat?: string;
    correo: string;
    telefono?: string;
    documentos_checks?: {
        identificacion_oficial: boolean;
        sua: boolean;
        permiso_entrada: boolean;
        lista_articulos: boolean;
        repse: boolean;
        soporte_pago_actualizado: boolean;
        constancia_vigencia_imss: boolean;
        constancias_habilidades: boolean;
    };
    documentos_archivos?: {
        identificacion_oficial?: string;
        sua?: string;
        permiso_entrada?: string;
        lista_articulos?: string;
        repse?: string;
        soporte_pago_actualizado?: string;
        constancia_vigencia_imss?: string;
        constancias_habilidades?: string;
    };
    hash_datos?: string;
    hash_ultimo_aprobado?: string;
    estado_validacion?: number; // 1: Pendiente, 2: Aprobado, 3: Rechazado
    motivo_rechazo?: string;
    fecha_validacion?: Date;
    validado_por?: mongoose.Types.ObjectId;
    id_visitante_re?: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const contratistaVisitanteSchema = new Schema<IContratistaVisitante>({
    id_contratista: { type: Schema.Types.ObjectId, required: true, ref: "contratistas" },
    id_empresa: { type: Schema.Types.ObjectId, required: true, ref: "empresas" },
    empresa: { type: String, required: true },
    nombre: {
        type: String,
        required: [true, "El nombre es obligatorio."],
        validate: {
            validator: (v: string) => REGEX_NAME.test(v),
            message: (props: { value: string }) => `'${props.value}' es un nombre inválido.`,
        },
    },
    apellido_pat: {
        type: String,
        required: [true, "El apellido paterno es obligatorio."],
        validate: {
            validator: (v: string) => REGEX_NAME.test(v),
            message: (props: { value: string }) => `'${props.value}' es un apellido paterno inválido.`,
        },
    },
    apellido_mat: {
        type: String,
        default: "",
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_NAME.test(v);
            },
            message: (props: { value: string }) => `'${props.value}' es un apellido materno inválido.`,
        },
    },
    correo: {
        type: String,
        required: [true, "El correo es obligatorio."],
        validate: {
            validator: (v: string) => REGEX_EMAIL.test(v),
            message: (props: { value: string }) => `'${props.value}' es un correo inválido.`,
        },
    },
    telefono: {
        type: String,
        default: "",
        validate: {
            validator: (v: string) => {
                if (!v) return true;
                return REGEX_PHONE.test(v);
            },
            message: () => "El teléfono es inválido.",
        },
    },
    documentos_checks: {
        identificacion_oficial: { type: Boolean, default: false },
        sua: { type: Boolean, default: false },
        permiso_entrada: { type: Boolean, default: false },
        lista_articulos: { type: Boolean, default: false },
        repse: { type: Boolean, default: false },
        soporte_pago_actualizado: { type: Boolean, default: false },
        constancia_vigencia_imss: { type: Boolean, default: false },
        constancias_habilidades: { type: Boolean, default: false },
    },
    documentos_archivos: {
        identificacion_oficial: { type: String, default: "" },
        sua: { type: String, default: "" },
        permiso_entrada: { type: String, default: "" },
        lista_articulos: { type: String, default: "" },
        repse: { type: String, default: "" },
        soporte_pago_actualizado: { type: String, default: "" },
        constancia_vigencia_imss: { type: String, default: "" },
        constancias_habilidades: { type: String, default: "" },
    },
    hash_datos: { type: String, default: "" },
    hash_ultimo_aprobado: { type: String, default: "" },
    estado_validacion: { type: Number, default: 1 },
    motivo_rechazo: { type: String, default: "" },
    fecha_validacion: { type: Date, default: null },
    validado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    id_visitante_re: { type: Schema.Types.ObjectId, default: null, ref: "visitantes" },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    activo: { type: Boolean, default: true },
});

contratistaVisitanteSchema.index({ id_contratista: 1, correo: 1 }, { unique: true });

contratistaVisitanteSchema.pre<IContratistaVisitante>("save", function (next) {
    try {
        this.nombre = this.nombre.trim();
        this.apellido_pat = this.apellido_pat.trim();
        this.apellido_mat = this.apellido_mat?.trim();
        this.correo = this.correo.trim().toLowerCase();
        this.telefono = this.telefono?.trim();
        this.empresa = this.empresa.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

contratistaVisitanteSchema.plugin(uniqueValidator, {
    type: "mongoose-unique-validator",
    message: "El {PATH} `{VALUE}` ya está registrado.",
});

const ContratistaVisitantes: Model<IContratistaVisitante> = mongoose.model<IContratistaVisitante>(
    "contratistas_visitantes",
    contratistaVisitanteSchema
);

export default ContratistaVisitantes;
