import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import { REGEX_EMAIL, REGEX_FABRI, REGEX_PHONE } from "../utils/commonRegex";

export interface IContratista extends Document {
    empresa: string;
    correos: string[];
    telefono?: string;
    id_usuario: mongoose.Types.ObjectId;
    id_empresa: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const contratistaSchema = new Schema<IContratista>({
    empresa: {
        type: String,
        required: [true, "El nombre de la empresa es obligatorio."],
        unique: true,
        uniqueCaseInsensitive: true,
        validate: {
            validator: (v: string) => REGEX_FABRI.test(v),
            message: (props: { value: string }) => `'${props.value}' es un nombre inválido.`,
        },
    },
    correos: [
        {
            type: String,
            default: "",
            validate: {
                validator: (v: string) => {
                    if (!v) return true;
                    return REGEX_EMAIL.test(v);
                },
                message: (props: { value: string }) => `'${props.value}' es un correo inválido.`,
            },
        },
    ],
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
    id_usuario: { type: Schema.Types.ObjectId, required: true, ref: "usuarios" },
    id_empresa: { type: Schema.Types.ObjectId, required: true, ref: "empresas" },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    activo: { type: Boolean, default: true },
});

contratistaSchema.pre<IContratista>("save", function (next) {
    try {
        this.empresa = this.empresa.trim();
        this.correos = (this.correos || [])
            .filter((c) => !!c)
            .map((c) => c.trim().toLowerCase());
        this.telefono = this.telefono?.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

contratistaSchema.plugin(uniqueValidator, {
    type: "mongoose-unique-validator",
    message: "El {PATH} `{VALUE}` ya está registrado.",
});

const Contratistas: Model<IContratista> = mongoose.model<IContratista>("contratistas", contratistaSchema);

export default Contratistas;
