import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecuperacion extends Document {
    correo: string;
    codigo: string;
    fecha_creacion?: Date;
    fecha_modificacion?: Date;
    activo: boolean;
}

const recuperacioneSchema = new Schema<IRecuperacion>({
    correo: { type: String, required: true },
    codigo: { type: String, required: true },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_modificacion: { type: Date },
    activo: { type: Boolean, default: true },
});

recuperacioneSchema.pre<IRecuperacion>('save', async function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const Recuperaciones: Model<IRecuperacion> = mongoose.model<IRecuperacion>('recuperaciones', recuperacioneSchema);

export default Recuperaciones;