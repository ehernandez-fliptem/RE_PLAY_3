import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILog extends Document {
  metodo: string;
  endpoint: string;
  status: number;
  headers: Record<string, any>;
  query: Record<string, any>;
  body: Record<string, any>;
  respuesta?: any;
  duracion_ms: number;
  ip: string;
  user_agent: string;
  id_usuario?: mongoose.Types.ObjectId;
  fecha_creacion: Date;
}

const RequestLogSchema = new Schema<ILog>({
  metodo: { type: String, required: true },
  endpoint: { type: String, required: true },
  status: { type: Number, required: true },
  headers: { type: Schema.Types.Mixed },
  query: { type: Schema.Types.Mixed },
  body: { type: Schema.Types.Mixed },
  respuesta: { type: Schema.Types.Mixed },
  duracion_ms: { type: Number, required: true },
  ip: { type: String, required: true },
  user_agent: { type: String, required: true },
  id_usuario: { type: Schema.Types.ObjectId, ref: 'usuarios', default: null },
  fecha_creacion: { type: Date, default: Date.now },
});

const RequestLog: Model<ILog> = mongoose.model<ILog>('logs', RequestLogSchema);

export default RequestLog;