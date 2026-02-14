import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvento extends Document {
    tipo_dispositivo: number;
    img_evento?: string;
    img_usuario?: string;
    fecha_panel_raw?: string;
    fecha_servidor_recepcion?: Date;
    desfase_reloj_segundos?: number;
    desfase_reloj_alerta?: boolean;
    qr?: string;
    tipo_check?: number;
    id_registro?: mongoose.Types.ObjectId;
    id_horario?: mongoose.Types.ObjectId;
    id_acceso?: mongoose.Types.ObjectId;
    id_empleado?: mongoose.Types.ObjectId;
    id_usuario?: mongoose.Types.ObjectId;
    id_visitante?: mongoose.Types.ObjectId;
    id_panel?: mongoose.Types.ObjectId;
    validado_por?: mongoose.Types.ObjectId;
    esAutorizado: number;
    comentario?: string;
    latitud?: string;
    longitud?: string;
    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const eventoSchema = new Schema<IEvento>({
    tipo_dispositivo: { type: Number, default: 1, ref: 'tipos_dispositivos' },
    img_evento: { type: String, default: '' },
    img_usuario: { type: String, default: '' },
    fecha_panel_raw: { type: String, default: '' },
    fecha_servidor_recepcion: { type: Date, default: null },
    desfase_reloj_segundos: { type: Number, default: 0 },
    desfase_reloj_alerta: { type: Boolean, default: false },
    qr: { type: String, default: '' },
    tipo_check: { type: Number, default: 0,  ref: 'tipos_eventos' },
    id_registro: { type: Schema.Types.ObjectId, default: null, ref: 'registros' },
    id_horario: { type: Schema.Types.ObjectId, default: null, ref: 'horarios' },
    id_acceso: { type: Schema.Types.ObjectId, default: null, ref: 'accesos' },
    id_empleado: { type: Schema.Types.ObjectId, default: null, ref: 'empleados' },
    id_usuario: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' }, // legacy
    id_visitante: { type: Schema.Types.ObjectId, default: null, ref: 'visitantes' },
    id_panel: { type: Schema.Types.ObjectId, default: null, ref: 'hikvision_dispositivos' },
    validado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    esAutorizado: { type: Number, default: 0 }, // 0 - Indefinido, 1 - Autorizado, 3 - Rechazado
    comentario: { type: String },
    latitud: { type: String },
    longitud: { type: String },
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});

// Optimizan deduplicación/líneas de tiempo por panel/persona.
eventoSchema.index({ id_panel: 1, qr: 1, tipo_check: 1, fecha_creacion: 1 });
eventoSchema.index({ id_empleado: 1, fecha_creacion: -1 });
eventoSchema.index({ id_visitante: 1, fecha_creacion: -1 });

eventoSchema.pre<IEvento>('save', async function (next) {
    try {
        this.fecha_creacion = this.fecha_creacion || new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const Eventos: Model<IEvento> = mongoose.model<IEvento>('eventos', eventoSchema);

export default Eventos;
