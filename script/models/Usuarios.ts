import mongoose, { Schema, Document, Model } from 'mongoose';

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
    },
    correo: {
        type: String,
        required: [true, 'El correo es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
    },
    contrasena: {
        type: String,
        required: [true, 'La contraseña es obligatoria.'],
    },
    rol: {
        type: [Number],
        required: [true, 'El rol es obligatorio.'],
        ref: "roles"
    },
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio.'],
    },
    apellido_pat: {
        type: String,
        required: [true, 'El apellido paterno es obligatorio.'],
    },
    apellido_mat: {
        type: String,
        default: "",
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
    id_puesto: { type: Schema.Types.ObjectId, required: true, ref: 'puestos' },
    id_departamento: { type: Schema.Types.ObjectId, required: true, ref: 'departamentos' },
    id_cubiculo: { type: Schema.Types.ObjectId, required: true, ref: 'cubiculos' },
    id_empresa: { type: Schema.Types.ObjectId, required: true, ref: 'empresas' },
    id_piso: { type: Schema.Types.ObjectId, required: true, ref: 'pisos' },
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

const Usuarios: Model<IUsuario> = mongoose.model<IUsuario>('usuarios', usuarioSchema);

export default Usuarios;