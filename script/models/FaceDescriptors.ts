import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFaceDescriptor extends Document {
    id_usuario?: mongoose.Types.ObjectId;
    id_visitante?: mongoose.Types.ObjectId;
    descriptor: number[]
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const faceDescriptorSchema = new Schema<IFaceDescriptor>({
    id_usuario: { type: Schema.Types.ObjectId, default: null },
    id_visitante: { type: Schema.Types.ObjectId, default: null },
    descriptor: [{ type: Number }],
    fecha_creacion: { type: Date, default: Date.now() },
    creado_por: { type: Schema.Types.ObjectId },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId },
    activo: { type: Boolean, default: true }
});


faceDescriptorSchema.pre<IFaceDescriptor>('save', function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const FaceDescriptors: Model<IFaceDescriptor> = mongoose.model<IFaceDescriptor>('face_descriptors', faceDescriptorSchema);

export default FaceDescriptors;