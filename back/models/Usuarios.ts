import mongoose, { Schema, Document, Model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import Contador from './plugin/Contador';

import {
    REGEX_EMAIL,
    REGEX_ROLES,
    REGEX_NAME,
    REGEX_BASE64,
} from '../utils/commonRegex';


export interface IUsuario extends Document {
    id_general: number,
    img_usuario?: string;
    correo: string;
    contrasena: string;
    rol: number[];
    nombre: string;
    apellido_pat: string;
    apellido_mat?: string;
    movil?: string;
    telefono?: string;
    extension?: string;
    id_puesto?: mongoose.Types.ObjectId;
    id_departamento?: mongoose.Types.ObjectId;
    id_cubiculo?: mongoose.Types.ObjectId;
    id_empresa: mongoose.Types.ObjectId;
    id_piso: mongoose.Types.ObjectId;
    id_horario?: mongoose.Types.ObjectId;
    accesos: mongoose.Types.ObjectId[];
    esRoot: boolean;
    insignias: number[];
    token_web?: string;
    token_app?: string;
    token_bloqueo?: string;
    intentos: number;
    arco: boolean;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const usuarioSchema = new Schema<IUsuario>({
    id_general: {
        type: Number,
        required: [true, 'El id general de usuario es obligatorio.'],
        default: 1,
    },
    img_usuario: {
        type: String,
        default: '',
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_BASE64.test(v);
            },
            message: () => `La imagen del usuario es inválida.`,
        },
    },
    correo: {
        type: String,
        required: [true, 'El correo es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
        validate: {
            validator: (v: string) => REGEX_EMAIL.test(v),
            message: (props: { value: string }) => `'${props.value}' es un correo inválido.`,
        },
    },
    contrasena: {
        type: String,
        required: [true, 'La contraseña es obligatoria.'],
    },
    rol: {
        type: [Number],
        required: [true, 'El rol es obligatorio.'],
        validate: {
            validator: (arr: number[]) =>
                !arr.some((i) => !Number.isInteger(i)) && REGEX_ROLES.test(arr.toString()),
            message: () => 'Los valores para el campo rol son incorrectos.',
        },
        ref: "roles"
    },
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio.'],
        validate: {
            validator: (v: string) => REGEX_NAME.test(v),
            message: (props: { value: string }) => `'${props.value}' es un nombre inválido.`,
        },
    },
    apellido_pat: {
        type: String,
        required: [true, 'El apellido paterno es obligatorio.'],
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
    movil: {
        type: String,
        default: ''
    },
    telefono: {
        type: String,
        default: ''
    },
    extension: {
        type: String,
        default: ''
    },
    id_puesto: { type: Schema.Types.ObjectId, ref: 'puestos', default: null, set: (v: any) => (v === '' || v === undefined ? null : v), },
    id_departamento: { type: Schema.Types.ObjectId, ref: 'departamentos', default: null, set: (v: any) => (v === '' || v === undefined ? null : v), },
    id_cubiculo: { type: Schema.Types.ObjectId, ref: 'cubiculos', default: null, set: (v: any) => (v === '' || v === undefined ? null : v), },
    id_empresa: { type: Schema.Types.ObjectId, required: [true, "Este campo es obligatorio"], ref: 'empresas' },
    id_piso: { type: Schema.Types.ObjectId, required: [true, "Este campo es obligatorio"], ref: 'pisos' },
    id_horario: { type: Schema.Types.ObjectId, default: null, ref: 'horarios' },
    accesos: [{ type: Schema.Types.ObjectId, required: true, ref: 'accesos' }],
    esRoot: { type: Boolean, require: true, default: false },
    insignias: {
        type: [Number],
        default: []
    },
    token_web: { type: String, default: '' },
    token_app: { type: String, default: '' },
    token_bloqueo: { type: String, default: '' },
    intentos: { type: Number, required: true, default: 5 },
    arco: { type: Boolean, required: true, default: false },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});

usuarioSchema.pre<IUsuario>('save', async function (next) {
    try {
        if (this.isNew) {
            const contador = await Contador.findOneAndUpdate(
                { nombre: 'usuarios' },
                { $inc: { secuencia: 1 } },
                { new: true, upsert: true }
            );
            this.id_general = contador.secuencia;
        }
        this.movil = this.movil?.trim();
        this.telefono = this.telefono?.trim();
        this.nombre = this.nombre.trim();
        this.apellido_pat = this.apellido_pat.trim();
        this.apellido_mat = this.apellido_mat?.trim();
        this.correo = this.correo?.trim().toLowerCase();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

usuarioSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Usuarios: Model<IUsuario> = mongoose.model<IUsuario>('usuarios', usuarioSchema);

export default Usuarios;