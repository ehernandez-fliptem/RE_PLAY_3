import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import { REGEX_BASE64, REGEX_FABRI } from "../utils/commonRegex";

export interface IAcceso extends Document {
    img_acceso?: string;
    identificador: string;
    nombre: string;
    empresas: mongoose.Types.ObjectId[];
    hikvision_dispositivos: mongoose.Types.ObjectId[];
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const accesoSchema = new Schema<IAcceso>({
    img_acceso: {
        type: String,
        default: "",
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_BASE64.test(v);
            },
            message: () => `La imagen de la empresa es inválida.`,
        },
    },
    identificador: {
        type: String,
        required: [true, 'El identificador es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
    },
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
        validate: {
            validator: (v: string) => REGEX_FABRI.test(v),
            message: (props: { value: string }) => `'${props.value}' es un nombre inválido.`,
        },
    },
    empresas: [{ type: Schema.Types.ObjectId, default: [], ref: "empresas" }],
    hikvision_dispositivos: [{ type: Schema.Types.ObjectId, default: [], ref: "hikvision_dispositivos" }],
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios", },
    activo: { type: Boolean, default: true },
});

accesoSchema.pre<IAcceso>('save', function (next) {
    try {
        this.identificador = this.identificador.trim();
        this.nombre = this.nombre.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

accesoSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Accesos: Model<IAcceso> = mongoose.model<IAcceso>('accesos', accesoSchema);

export default Accesos;