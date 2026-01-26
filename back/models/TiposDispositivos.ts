import mongoose, { Schema, Document, Model } from 'mongoose';
import { REGEX_HEX } from '../utils/commonRegex';

export interface ITipoDispositivo extends Document {
    tipo: number;
    nombre: string;
    color: string;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const tiposDispositSchema = new Schema<ITipoDispositivo>({
    tipo: { type: Number, required: true },
    nombre: { type: String, required: true },
    color: {
        type: String,
        required: true,
        validate: {
            validator: (v: string) => REGEX_HEX.test(v),
            message: () => `El color no es hexadecimal.`,
        }
    },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios", },
    activo: { type: Boolean, default: true },
});

tiposDispositSchema.pre<ITipoDispositivo>('save', async function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const TiposDispositivos: Model<ITipoDispositivo> = mongoose.model<ITipoDispositivo>('tipos_dispositivos', tiposDispositSchema);

export default TiposDispositivos;