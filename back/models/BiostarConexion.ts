import mongoose, { Document, Model, Schema } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import { REGEX_IP } from "../utils/commonRegex";
import { encryptPassword } from "../utils/utils";
import { CONFIG } from "../config";

export interface IBiostarConexion extends Document {
  nombre: string;
  direccion_ip: string;
  puerto: number;
  usuario: string;
  contrasena: string;
  session_id?: string;
  session_expira?: Date | null;
  fecha_creacion?: Date;
  fecha_modificacion?: Date;
  activo: boolean;
}

const biostarConexionSchema = new Schema<IBiostarConexion>({
  nombre: { type: String, required: true, default: "Conexion Global BioStar", unique: true, uniqueCaseInsensitive: true },
  direccion_ip: {
    type: String,
    required: true,
    default: "",
    validate: {
      validator: (v: string) => REGEX_IP.test(v),
      message: (props: { value: string }) => `'${props.value}' es una direccion IP invalida.`,
    },
  },
  puerto: { type: Number, required: true, default: CONFIG.BIOSTAR_PORT },
  usuario: { type: String, required: true, default: "" },
  contrasena: { type: String, required: true, default: "" },
  session_id: { type: String, default: "" },
  session_expira: { type: Date, default: null },
  fecha_creacion: { type: Date, default: Date.now },
  fecha_modificacion: { type: Date, default: null },
  activo: { type: Boolean, default: true },
});

biostarConexionSchema.pre<IBiostarConexion>("save", function (next) {
  try {
    const hash = encryptPassword(this.contrasena.trim(), CONFIG.SECRET_CRYPTO);
    this.nombre = String(this.nombre || "Conexion Global BioStar").trim();
    this.usuario = this.usuario.trim();
    this.contrasena = hash;
    this.fecha_creacion = new Date();
    next();
  } catch (error) {
    next(error as Error);
  }
});

biostarConexionSchema.plugin(uniqueValidator, {
  type: "mongoose-unique-validator",
  message: "El {PATH} `{VALUE}` ya esta registrado.",
});

const BiostarConexion: Model<IBiostarConexion> = mongoose.model<IBiostarConexion>("biostar_conexion_global", biostarConexionSchema);

export default BiostarConexion;
