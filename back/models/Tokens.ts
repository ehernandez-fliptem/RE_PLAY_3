import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IToken extends Document {
    token: string;
    tipo: number;
    creado_por?: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    activo: boolean;
}

const tokenSchema = new Schema<IToken>({
    token: { type: String, required: true },
    tipo: { type: Number, required: true },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_creacion: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true },
});

tokenSchema.pre<IToken>('save', async function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const Tokens: Model<IToken> = mongoose.model<IToken>('tokens', tokenSchema);

export default Tokens;