import mongoose, { Schema, Document, Model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { REGEX_IP } from '../utils/commonRegex';
import { encryptPassword } from '../utils/utils';
import { CONFIG } from '../config';

export interface IDispositivoBiostar extends Document {
  nombre: string;
  direccion_ip: string;
  puerto: number;
  usuario: string;
  contrasena: string;
  session_id?: string;
  session_expira?: Date | null;
  fecha_creacion?: Date;
  creado_por?: mongoose.Types.ObjectId;
  fecha_modificacion?: Date;
  modificado_por?: mongoose.Types.ObjectId;
  activo: boolean;
}

const dispositivosBiostarSchema = new Schema<IDispositivoBiostar>({
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
      message: (props: { value: string }) => `'${props.value}' es una direccion IP invalida.`,
    },
  },
  puerto: { type: Number, required: true, default: CONFIG.BIOSTAR_PORT },
  usuario: { type: String, required: true, default: '' },
  contrasena: { type: String, required: true, default: '' },
  session_id: { type: String, default: '' },
  session_expira: { type: Date, default: null },
  fecha_creacion: { type: Date, default: Date.now },
  creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
  fecha_modificacion: { type: Date },
  modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
  activo: { type: Boolean, default: true },
});

dispositivosBiostarSchema.pre<IDispositivoBiostar>('save', function (next) {
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

dispositivosBiostarSchema.plugin(uniqueValidator, {
  type: 'mongoose-unique-validator',
  message: 'El {PATH} `{VALUE}` ya esta registrado.',
});

const DispositivosBiostar: Model<IDispositivoBiostar> = mongoose.model<IDispositivoBiostar>('biostar_dispositivos', dispositivosBiostarSchema);

export default DispositivosBiostar;
