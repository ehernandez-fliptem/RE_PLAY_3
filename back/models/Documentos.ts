import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

export interface IDocumento extends Document {
    tipo: number;
    estatus: number; // 1 - Por Validar, 2: Rechazado 3: Aceptado
    documento?: string;
    imagenes?: string[];
    tiempo_indefinido?: boolean;
    fecha_entrada?: Date;
    fecha_salida?: Date;
    motivo?: string;
    fecha_validacion?: Date;
    validado_por?: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const documentoSchema = new Schema<IDocumento>({
    tipo: { type: Number, required: [true, "El tipo de documento es obligatorio."], ref: "tipos_documentos" },
    estatus: {
        type: Number,
        default: 1,
        min: [1, "El estatus no puede ser menor a 1"],
        max: [3, "El estatus no puede ser mayor a 3"]
    },
    documento: { type: String },
    imagenes: {
        type: [String],
        validate: {
            validator: (v: string[]) => v.length <= 2,
            message: () => "El máximo de imagenes es de 2."
        }
    },
    tiempo_indefinido: { type: Boolean, default: true },
    fecha_entrada: { type: Date },
    fecha_salida: { type: Date },
    motivo: { type: String },
    fecha_validacion: { type: Date },
    validado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios", },
    activo: { type: Boolean, default: true },
});

documentoSchema.pre<IDocumento>('save', function (next) {
    try {
        this.motivo = this.motivo?.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

documentoSchema.plugin(uniqueValidator, {
    type: 'mongoose-unique-validator',
    message: 'El {PATH} `{VALUE}` ya está registrado.',
});

const Documentos: Model<IDocumento> = mongoose.model<IDocumento>('documentos', documentoSchema);

export default Documentos;