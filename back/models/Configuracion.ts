import mongoose, { Schema, Document, Model } from 'mongoose';
import { REGEX_BASE64, REGEX_HEX, REGEX_HTMLTAG } from '../utils/commonRegex';

interface ColorOptions {
    main: string;
    light?: string;
    dark?: string;
    contrastText?: string;
}

interface ColorPalette {
    primary: ColorOptions;
    secondary: ColorOptions;
    error?: ColorOptions;
    warning?: ColorOptions;
    info?: ColorOptions;
    success?: ColorOptions;
}

export interface IConfiguracion extends Document {
    appNombre: string;
    zonaHoraria: string;
    imgCorreo: string;
    saludaCorreo: string;
    despedidaCorreo: string;

    tiempoFotoVisita: number;
    delayProximaFoto: number;
    tiempoCancelacionRegistros: string;
    tiempoToleranciaEntrada: string;
    tiempoToleranciaSalida: string;
    habilitarIntegracionHv: boolean;
    habilitarIntegracionCdvi: boolean;
    habilitarCamaras: boolean;

    autorizacionCheck?: boolean;
    validarHorario?: boolean;
    notificarCheck?: boolean;
    correoUnoAutorizacion?: string;
    correoDosAutorizacion?: string;

    palette?: ColorPalette;

    fecha_creacion?: Date;
    creado_por?: mongoose.Types.ObjectId;
    fecha_modificacion?: Date;
    modificado_por?: mongoose.Types.ObjectId;
    activo: boolean;
}

const colorValidator = {
    validator: (v: string) => REGEX_HEX.test(v),
    message: () => `El color no es hexadecimal.`,
}

const configuracionSchema = new Schema<IConfiguracion>({
    // 1. Generales
    appNombre: { type: String, default: 'Flipbot' },
    zonaHoraria: { type: String, default: 'America/Mexico_City' },
    // 1.1. Correos
    imgCorreo: {
        type: String,
        required: [true, 'El logo de la empresa es obligatorio.'],
        validate: {
            validator: (v: string) => REGEX_BASE64.test(v),
            message: () => `La imagen del usuario es inválida.`,
        },
    },
    saludaCorreo: {
        type: String,
        default: '',
        validate: {
            validator: (v: string) => !REGEX_HTMLTAG.test(v),
            message: () => `El mensaje de saludo contiene etiquetas HTML inválidas.`,
        },
    },
    despedidaCorreo: {
        type: String,
        default: '',
        validate: {
            validator: (v: string) => !REGEX_HTMLTAG.test(v),
            message: () => `El mensaje de despedida contiene etiquetas HTML inválidas.`,
        },
    },
    // 1.2. Usuarios
    validarHorario: { type: Boolean, default: false },
    notificarCheck: { type: Boolean, default: false },
    autorizacionCheck: { type: Boolean, default: false },
    correoUnoAutorizacion: { type: String, default: '' },
    correoDosAutorizacion: { type: String, default: '' },
    delayProximaFoto: { type: Number, default: 5 },
    // 1.3. Registros
    tiempoFotoVisita: { type: Number, default: 5 },
    tiempoCancelacionRegistros: { type: String, default: '1/m' },
    tiempoToleranciaEntrada: { type: String, default: '1/m' },
    tiempoToleranciaSalida: { type: String, default: '1/m' },
    habilitarIntegracionHv: { type: Boolean, default: false },
    habilitarIntegracionCdvi: { type: Boolean, default: false },
    habilitarCamaras: { type: Boolean, default: false },

    // 1.4 Apariencia
    palette: {
        primary: {
            main: {
                type: String,
                validate: colorValidator
            },
        },
        secondary: {
            main: {
                type: String,
                validate: colorValidator
            },
        },
        error: {
            main: {
                type: String,
                validate: colorValidator
            },
        },
        warning: {
            main: {
                type: String,
                validate: colorValidator
            },
        },
        info: {
            main: {
                type: String,
                validate: colorValidator
            },
        },
        success: {
            main: {
                type: String,
                validate: colorValidator
            },
        },
    },
    // Sistema
    fecha_creacion: { type: Date, default: Date.now },
    creado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    fecha_modificacion: { type: Date },
    modificado_por: { type: Schema.Types.ObjectId, default: null, ref: 'usuarios' },
    activo: { type: Boolean, default: true },
});

configuracionSchema.pre<IConfiguracion>('save', async function (next) {
    try {
        this.fecha_creacion = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const Configuracion: Model<IConfiguracion> = mongoose.model<IConfiguracion>('configuraciones', configuracionSchema);

export default Configuracion;