import mongoose, { Schema, Document, Model } from 'mongoose';
import { REGEX_HEX } from '../utils/commonRegex';

export interface ITipoDocumento extends Document {
    tipo: number;
    nombre: string;
    color: string;
    extensiones?: string[];
    descripcion: string;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const tiposDocumentoSchema = new Schema<ITipoDocumento>({
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
    extensiones: { type: Array, default: [] },
    descripcion: { type: String, required: true },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios", },
    activo: { type: Boolean, default: true },
});

tiposDocumentoSchema.pre<ITipoDocumento>('save', async function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const TiposDocumentos: Model<ITipoDocumento> = mongoose.model<ITipoDocumento>('tipos_documentos', tiposDocumentoSchema);

export default TiposDocumentos;