import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContratistaDocumento extends Document {
    id_contratista: mongoose.Types.ObjectId;
    id_empresa: mongoose.Types.ObjectId;
    empresa: string;
    documentos_checks?: Record<string, boolean>;
    documentos_archivos?: Record<string, string>;
    estado_validacion?: number;
    motivo_rechazo?: string;
    fecha_validacion?: Date;
    validado_por?: mongoose.Types.ObjectId;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const contratistaDocumentoSchema = new Schema<IContratistaDocumento>({
    id_contratista: { type: Schema.Types.ObjectId, required: true, ref: "contratistas" },
    id_empresa: { type: Schema.Types.ObjectId, required: true, ref: "empresas" },
    empresa: { type: String, required: true },
    documentos_checks: {
        type: Map,
        of: Boolean,
        default: {},
    },
    documentos_archivos: {
        type: Map,
        of: String,
        default: {},
    },
    estado_validacion: { type: Number, default: 1 },
    motivo_rechazo: { type: String, default: "" },
    fecha_validacion: { type: Date, default: null },
    validado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: "usuarios" },
    activo: { type: Boolean, default: true },
});

contratistaDocumentoSchema.index({ id_contratista: 1 }, { unique: true });

contratistaDocumentoSchema.pre<IContratistaDocumento>("save", function (next) {
    try {
        this.empresa = this.empresa.trim();
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const ContratistaDocumentos: Model<IContratistaDocumento> = mongoose.model<IContratistaDocumento>(
    "contratistas_documentos",
    contratistaDocumentoSchema
);

export default ContratistaDocumentos;
