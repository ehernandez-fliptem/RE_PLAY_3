import mongoose, { Schema, Document, Model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { REGEX_NAME } from '../utils/commonRegex';

export interface IHora { hora: number; minuto: number }

export interface IHorario extends Document {
    nombre: string;
    horario: {
        entrada: IHora;
        salida: IHora;
        esNocturno: boolean;
        activo: boolean;
    }[];
    id_empresa: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const horarioSchema = new Schema<IHorario>({
    nombre: {
        type: String,
        required: [true, 'El nombre de usuario es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
        validate: {
            validator: (v: string) => REGEX_NAME.test(v),
            message: (props: { value: string }) => `'${props.value}' es un nombre inválido.`,
        },
    },
    horario: [
        {
            entrada: { type: { hora: Number, minuto: Number } },
            salida: { type: { hora: Number, minuto: Number } },
            esNocturno: { type: Boolean },
            activo: { type: Boolean }
        },
    ],
    id_empresa: { type: Schema.Types.ObjectId, default: null, ref: 'empresas' },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});


horarioSchema.pre<IHorario>('save', async function (next) {
    try {
        this.nombre = this.nombre.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

horarioSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Horarios: Model<IHorario> = mongoose.model<IHorario>('horarios', horarioSchema);

export default Horarios;