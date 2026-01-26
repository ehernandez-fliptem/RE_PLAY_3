import mongoose, { Schema, Document, Model } from 'mongoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';


export interface IPase extends Document {
    codigo: string;
    fabricante?: string;
    modelo?: string;
    tipo?: string;
    vigente: boolean;
    id_empresa: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const paseSchema = new Schema<IPase>({
    codigo: {
        type: String,
        required: [true, 'El código es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
    },
    fabricante: { type: String },
    modelo: { type: String },
    tipo: { type: String },
    vigente: { type: Boolean, default: true },
    id_empresa: {
        type: Schema.Types.ObjectId, required: [true, 'La empresa es obligatoria.'],
    },
    fecha_creacion: { type: Date, default: Date.now() },
    creado_por: { type: Schema.Types.ObjectId },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId },
    activo: { type: Boolean, default: true }
});


paseSchema.pre<IPase>('save', async function (next) {
    try {
        this.codigo = this.codigo.trim();
        this.fabricante = this.fabricante?.trim();
        this.modelo = this.modelo?.trim();
        this.tipo = this.tipo?.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

paseSchema.plugin(mongooseUniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Pases: Model<IPase> = mongoose.model<IPase>('pases', paseSchema);

export default Pases;