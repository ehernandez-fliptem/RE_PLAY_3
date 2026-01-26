import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import { REGEX_DOCS, REGEX_BASE64, REGEX_FABRI, REGEX_RFC } from "../utils/commonRegex";

export interface IContacto { numero: string; extension?: string }
export interface IEmpresa extends Document {
    img_empresa?: string;
    nombre: string;
    rfc: string;
    telefonos: IContacto[];
    pisos: mongoose.Types.ObjectId[];
    accesos: mongoose.Types.ObjectId[];
    puestos?: mongoose.Types.ObjectId[];
    departamentos?: mongoose.Types.ObjectId[];
    cubiculos?: mongoose.Types.ObjectId[];
    esRoot: boolean;
    documentos?: number[];
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const empresaSchema = new Schema<IEmpresa>({
    img_empresa: {
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
    rfc: {
        type: String,
        required: [true, 'El RFC es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
        validate: {
            validator: (v: string) => REGEX_RFC.test(v),
            message: (props: { value: string }) => `'${props.value}' es un RFC inválido.`,
        },
    },
    telefonos: [
        {
            _id: { type: Schema.Types.ObjectId, required: true },
            numero: { type: String },
            extension: { type: String },
        },
    ],
    pisos: [{ type: Schema.Types.ObjectId, default: [], ref: "pisos" }],
    accesos: [{ type: Schema.Types.ObjectId, default: [], ref: "accesos" }],
    puestos: [{ type: Schema.Types.ObjectId, default: [], ref: 'puestos' }],
    departamentos: [{ type: Schema.Types.ObjectId, default: [], ref: 'departamentos' }],
    cubiculos: [{ type: Schema.Types.ObjectId, default: [], ref: 'cubiculos' }],
    esRoot: { type: Boolean, require: true, default: false },
    documentos: {
        type: [Number],
        default: [],
        validate: {
            validator: (arr: number[]) => {
                if (arr.length > 0) {
                    !arr.some((i) => !Number.isInteger(i)) && REGEX_DOCS.test(arr.toString());
                }
                return true;
            },
            message: () => 'Los valores para el campo documento son incorrectos.',
        },
    },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios", },
    activo: { type: Boolean, default: true },
});

empresaSchema.pre<IEmpresa>('save', function (next) {
    try {
        this.nombre = this.nombre.trim();
        this.rfc = this.rfc.trim().toUpperCase();
        this.telefonos.map((item: IContacto) => { return { numero: item.numero.trim(), extension: item.extension?.trim() } })
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

empresaSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Empresas: Model<IEmpresa> = mongoose.model<IEmpresa>('empresas', empresaSchema);

export default Empresas;