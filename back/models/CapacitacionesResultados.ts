import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICapacitacionResultado extends Document {
    capacitacion: mongoose.Types.ObjectId;
    nombre?: string;
    correo?: string;
    empresa?: string;
    numero_empleado?: string;
    fecha_inicio: Date;
    fecha_fin?: Date;
    completado: boolean;
    porcentaje: number;
    respuestas: any[];
    pasos_completados: string[];
    tiempo_total_segundos: number;
    origen?: string;
}

const capacitacionResultadoSchema = new Schema<ICapacitacionResultado>({
    capacitacion: { type: Schema.Types.ObjectId, required: true, ref: "capacitaciones" },
    nombre: { type: String, default: "" },
    correo: { type: String, default: "" },
    empresa: { type: String, default: "" },
    numero_empleado: { type: String, default: "" },
    fecha_inicio: { type: Date, default: Date.now },
    fecha_fin: { type: Date },
    completado: { type: Boolean, default: false },
    porcentaje: { type: Number, default: 0 },
    respuestas: { type: Array as any, default: [] },
    pasos_completados: { type: [String], default: [] },
    tiempo_total_segundos: { type: Number, default: 0 },
    origen: { type: String, default: "publico" },
});

const CapacitacionesResultados: Model<ICapacitacionResultado> = mongoose.model<ICapacitacionResultado>(
    "capacitaciones_resultados",
    capacitacionResultadoSchema
);

export default CapacitacionesResultados;
