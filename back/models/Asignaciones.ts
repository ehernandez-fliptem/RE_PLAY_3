import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAsignacion extends Document {
    id_horario: mongoose.Types.ObjectId;
    id_usuario: mongoose.Types.ObjectId;
    esIndeterminado?: boolean;
    periodo?: {
        inicio?: Date;
        fin?: Date;
    };
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const asignacionSchema = new Schema<IAsignacion>({
    id_usuario: { type: Schema.Types.ObjectId, required: [true, "Este campo es requerido."], ref: 'usuarios' },
    id_horario: { type: Schema.Types.ObjectId, required: [true, "Este campo es requerido."], ref: 'horarios' },
    esIndeterminado: { type: Boolean },
    periodo: {
        inicio: { type: Date },
        fin: { type: Date },
    },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});


asignacionSchema.pre<IAsignacion>('save', async function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const Asignaciones: Model<IAsignacion> = mongoose.model<IAsignacion>('asignaciones', asignacionSchema);

export default Asignaciones;