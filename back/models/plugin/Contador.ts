import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContador extends Document {
  nombre: string;
  secuencia: number;
}

const contadorSchema = new Schema<IContador>({
  nombre: { type: String, required: true, unique: true },
  secuencia: { type: Number, default: 0 },
});

const Contador: Model<IContador> = mongoose.model<IContador>('Contador', contadorSchema);

export default Contador;