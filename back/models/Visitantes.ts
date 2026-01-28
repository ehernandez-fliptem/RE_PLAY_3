import mongoose, { Schema, Document, Model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import Contador from './plugin/Contador';

import {
    REGEX_EMAIL,
    REGEX_NAME,
    REGEX_BASE64,
} from '../utils/commonRegex';
import { generarCodigoUnico } from '../utils/utils';


export interface IVisitante extends Document {
    _id: any;          // o Types.ObjectId
    bloqueado: boolean;
    desbloqueado_hasta?: Date | null; 
    id_visitante: number,
    codigo: string;
    img_usuario?: string;
    correo: string;
    contrasena: string;
    nombre: string;
    apellido_pat: string;
    apellido_mat?: string;
    telefono?: string;
    documentos?: mongoose.Types.ObjectId[]
    empresa?: string;
    rol: number[]
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

const visitanteSchema = new Schema<IVisitante>({
    id_visitante: {
        type: Number,
        required: [true, 'El id general de usuario es obligatorio.'],
        default: 1,
    },
    codigo: {
        type: String,
        required: [true, 'El código del usuario es obligatorio.'],
        default: "12345"
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
    telefono: { type: String, default: '' },
    empresa: { type: String, default: '' },
    documentos: [{ type: Schema.Types.ObjectId, default: null, ref: 'documentos' }],
    rol: {
        type: [Number],
        required: [true, 'El rol es obligatorio.'],
        default: [10],
        ref: "roles"
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
    bloqueado: { type: Boolean, default: false },
    desbloqueado_hasta: { type: Date, default: null },
});

visitanteSchema.pre<IVisitante>('save', async function (next) {
    try {
        if (this.isNew) {
            const contador = await Contador.findOneAndUpdate(
                { nombre: 'visitantes' },
                { $inc: { secuencia: 1 } },
                { new: true, upsert: true }
            );
            this.id_visitante = contador.secuencia;
            this.codigo = generarCodigoUnico(5);
        }
        this.correo = this.correo?.trim().toLowerCase();
        this.nombre = this.nombre.trim();
        this.apellido_pat = this.apellido_pat.trim();
        this.apellido_mat = this.apellido_mat?.trim();
        this.telefono = this.telefono?.trim();
        this.empresa = this.empresa?.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

visitanteSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Usuarios: Model<IVisitante> = mongoose.model<IVisitante>('visitantes', visitanteSchema);

export default Usuarios;