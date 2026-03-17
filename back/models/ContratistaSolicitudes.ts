import mongoose, { Schema, Document, Model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

export interface IContratistaSolicitudItem {
    id_visitante: mongoose.Types.ObjectId;
    estado: number; // 1: Pendiente, 2: Aprobado, 3: Rechazado
    motivo?: string;
}

export interface IContratistaSolicitud extends Document {
    id_contratista: mongoose.Types.ObjectId;
    id_empresa: mongoose.Types.ObjectId;
    fecha_visita: Date;
    comentario?: string;
    estado: number; // 1: Pendiente, 2: Aprobado, 3: Rechazado, 4: Parcial
    items: IContratistaSolicitudItem[];
    enviado_por: mongoose.Types.ObjectId;
    revisado_por?: mongoose.Types.ObjectId;
    fecha_revision?: Date;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const itemSchema = new Schema<IContratistaSolicitudItem>({
    id_visitante: { type: Schema.Types.ObjectId, required: true, ref: "contratistas_visitantes" },
    estado: { type: Number, default: 1 },
    motivo: { type: String, default: "" },
});

const solicitudSchema = new Schema<IContratistaSolicitud>({
    id_contratista: { type: Schema.Types.ObjectId, required: true, ref: "contratistas" },
    id_empresa: { type: Schema.Types.ObjectId, required: true, ref: "empresas" },
    fecha_visita: { type: Date, required: true },
    comentario: { type: String, default: "" },
    estado: { type: Number, default: 1 },
    items: { type: [itemSchema], default: [] },
    enviado_por: { type: Schema.Types.ObjectId, required: true, ref: "usuarios" },
    revisado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_revision: { type: Date, default: null },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    activo: { type: Boolean, default: true },
});

solicitudSchema.pre<IContratistaSolicitud>("save", function (next) {
    try {
        this.comentario = this.comentario?.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

solicitudSchema.plugin(uniqueValidator, {
    type: "mongoose-unique-validator",
    message: "El {PATH} `{VALUE}` ya está registrado.",
});

const ContratistaSolicitudes: Model<IContratistaSolicitud> = mongoose.model<IContratistaSolicitud>(
    "contratistas_solicitudes",
    solicitudSchema
);

export default ContratistaSolicitudes;
