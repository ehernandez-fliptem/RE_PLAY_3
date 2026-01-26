import mongoose, { Schema, Document, Model } from 'mongoose';
import { REGEX_EMAIL, REGEX_NAME, REGEX_BASE64 } from '../utils/commonRegex';
import mongooseUniqueValidator from 'mongoose-unique-validator';

export interface IAccesoRegistro {
    id_acceso: mongoose.Types.ObjectId;
    modo: number;
}

export interface IRegistro extends Document {
    // No interactivos
    codigo: string;
    estatus: mongoose.Types.ObjectId[];

    // Generales
    tipo_registro: number;
    correo: string;
    nombre: string;
    apellido_pat: string;
    apellido_mat?: string;
    telefono?: string;
    documentos: mongoose.Types.ObjectId[];

    img_usuario?: string;
    tipo_ide?: number;
    img_ide_a?: string;
    img_ide_b?: string;
    numero_ide?: string;
    empresa?: string;
    id_pase?: mongoose.Types.ObjectId;

    // Visita
    id_anfitrion: mongoose.Types.ObjectId;
    actividades: string;
    fecha_entrada: Date;
    fecha_salida?: Date;
    accesos: IAccesoRegistro[];

    //Adicionales
    comentarios?: string;
    placas?: string;
    desc_vehiculo?: string;
    motivo_cancelacion?: string;

    // Sistema
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const registrosSchema = new Schema<IRegistro>({
    tipo_registro: {
        type: Number,
        required: true,
        min: [1, 'Tipo de registro no existe'],
        max: [2, 'Tipo de registro no existe'],
        ref: 'tipos_registros'
    },
    codigo: { type: String, required: true },
    correo: {
        type: String,
        default: '',
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_EMAIL.test(v);
            },
            message: (props: { value: string }) => `'${props.value}' es un correo inválido.`,
        },
    },
    nombre: {
        type: String,
        default: '',
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_NAME.test(v);
            },
            message: (props: { value: string }) => `'${props.value}' es un nombre inválido.`,
        },
    },
    apellido_pat: {
        type: String,
        default: '',
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_NAME.test(v);
            },
            message: (props: { value: string }) => `'${props.value}' es un apellido inválido.`,
        },
    },
    apellido_mat: {
        type: String,
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_NAME.test(v);
            },
            message: (props: { value: string }) => `'${props.value}' es un apellido materno inválido.`,
        },
    },
    telefono: {
        type: String,
        default: '',
    },
    documentos: [{ type: Schema.Types.ObjectId, ref: 'documentos' }],
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
    img_ide_a: {
        type: String,
        default: '',
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_BASE64.test(v);
            },
            message: () => `La imagen frontal de la identificación es inválida.`,
        },
    },
    img_ide_b: {
        type: String,
        default: '',
        validate: {
            validator: (v: string | undefined) => {
                if (!v) return true;
                return REGEX_BASE64.test(v);
            },
            message: () => `La imagen trasera de la identificación es inválida.`,
        },
    },
    empresa: { type: String, default: '', },
    id_pase: { type: Schema.Types.ObjectId, default: null, ref: 'pases' },
    tipo_ide: { type: Number },
    numero_ide: { type: String },
    id_anfitrion: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    actividades: { type: String, default: '' },
    fecha_entrada: { type: Date, required: [true, "La fecha de entrada es obligatoria."] },
    fecha_salida: { type: Date },
    accesos: [{ id_acceso: Schema.Types.ObjectId, modo: Number }],
    estatus: [{ type: Schema.Types.ObjectId, ref: 'eventos' }],
    comentarios: { type: String, default: '' },
    placas: { type: String, default: '' },
    desc_vehiculo: { type: String, default: '' },
    motivo_cancelacion: { type: String },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});

registrosSchema.pre<IRegistro>('save', async function (next) {
    try {
        this.nombre = this.nombre?.trim();
        this.apellido_pat = this.apellido_pat?.trim();
        this.apellido_mat = this.apellido_mat?.trim();
        this.correo = this.correo?.trim();
        this.telefono = this.telefono?.trim();
        this.numero_ide = this.numero_ide?.trim();
        this.actividades = this.actividades?.trim();
        this.comentarios = this.comentarios?.trim();
        this.placas = this.placas?.trim();
        this.desc_vehiculo = this.desc_vehiculo?.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

registrosSchema.plugin(mongooseUniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Registros: Model<IRegistro> = mongoose.model<IRegistro>('registros', registrosSchema);

export default Registros;