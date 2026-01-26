import mongoose, { Schema, Document, Model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { REGEX_IP } from '../utils/commonRegex';
import { encryptPassword } from '../utils/utils';

import { CONFIG } from "../config";

export interface IDispositivoHv extends Document {
    nombre: string;
    direccion_ip: string;
    usuario: string;
    contrasena: string;
    habilitar_citas: boolean;
    tipo_evento: number;
    id_acceso: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const dispositivosHvSchema = new Schema<IDispositivoHv>({
    // Generales
    nombre: {
        type: String,
        required: [true, 'El nombre del dispositivo es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
        default: '',
    },
    direccion_ip: {
        type: String,
        required: true,
        unique: true,
        uniqueCaseInsensitive: true,
        default: '',
        validate: {
            validator: (v: string) => REGEX_IP.test(v),
            message: (props: { value: string }) => `'${props.value}' es una dirección IP inválida.`,
        },
    },
    usuario: { type: String, required: true, default: '' },
    contrasena: { type: String, required: true, default: '' },
    habilitar_citas: { type: Boolean, default: false },
    tipo_evento: { type: Number, required: true, ref: 'tipos_eventos' },
    id_acceso: { type: Schema.Types.ObjectId, required: [true, 'El acceso es obligatorio.'], ref: 'accesos' },
    // Sistema
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});

dispositivosHvSchema.pre<IDispositivoHv>('save', function (next) {
    try {
        const hash = encryptPassword(this.contrasena.trim(), CONFIG.SECRET_CRYPTO);
        this.nombre = this.nombre.trim();
        this.usuario = this.usuario.trim();
        this.contrasena = hash;
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

dispositivosHvSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const DispositivosHv: Model<IDispositivoHv> = mongoose.model<IDispositivoHv>('hikvision_dispositivos', dispositivosHvSchema);

export default DispositivosHv;