import mongoose, { Document, Model, Schema } from "mongoose";
import { REGEX_BASE64 } from "../utils/commonRegex";

export type CampoTipo = "IN" | "OUT";

export interface IRegistroCampo extends Document {
    id_empleado: mongoose.Types.ObjectId;
    id_usuario: mongoose.Types.ObjectId;
    tipo: CampoTipo;
    fecha_hora_servidor: Date;
    latitud: number;
    longitud: number;
    precision?: number | null;
    foto: string;
    origen: "web";
    estatus: "ok";
    fecha_creacion?: Date;
}

const registroCampoSchema = new Schema<IRegistroCampo>({
    id_empleado: { type: Schema.Types.ObjectId, required: true, ref: "empleados", index: true },
    id_usuario: { type: Schema.Types.ObjectId, required: true, ref: "usuarios", index: true },
    tipo: { type: String, enum: ["IN", "OUT"], required: true, index: true },
    fecha_hora_servidor: { type: Date, required: true, default: Date.now, index: true },
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },
    precision: { type: Number, default: null },
    foto: {
        type: String,
        required: [true, "La foto es obligatoria."],
        validate: {
            validator: (v: string) => REGEX_BASE64.test(v),
            message: () => "La foto de evidencia es inválida.",
        },
    },
    origen: { type: String, enum: ["web"], default: "web", required: true },
    estatus: { type: String, enum: ["ok"], default: "ok", required: true },
    fecha_creacion: { type: Date, default: Date.now },
});

registroCampoSchema.index({ id_empleado: 1, fecha_hora_servidor: -1 });

const RegistrosCampo: Model<IRegistroCampo> = mongoose.model<IRegistroCampo>(
    "registros_campo",
    registroCampoSchema
);

export default RegistrosCampo;

