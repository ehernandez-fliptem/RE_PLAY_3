import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

export interface IPiso extends Document {
    identificador: string;
    nombre: string;
    empresas: mongoose.Types.ObjectId[];
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const pisoSchema = new Schema<IPiso>({
    identificador: {
        type: String,
        required: [true, 'El identificador es obligatorio.'],
        unique: true,
        uniqueCaseInsensitive: true,
    },
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio.'],
    },
    empresas: [{ type: Schema.Types.ObjectId, default: [], ref: "empresas" }],
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios", },
    activo: { type: Boolean, default: true },
});

pisoSchema.pre<IPiso>('save', function (next) {
    try {
        this.identificador = this.identificador.trim();
        this.nombre = this.nombre.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

pisoSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Pisos: Model<IPiso> = mongoose.model<IPiso>('pisos', pisoSchema);

export default Pisos;