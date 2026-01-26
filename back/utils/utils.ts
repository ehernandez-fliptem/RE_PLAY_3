import Configuracion, { IConfiguracion } from "../models/Configuracion";
import Eventos from "../models/Eventos";
import Registros, { IRegistro } from "../models/Registros";
import Horarios, { IHorario } from "../models/Horarios";
import CryptoJS from "crypto-js";
import { ProjectionType, Types } from 'mongoose';
import { QueryParams } from "../types/queryparams";
import Usuarios from "../models/Usuarios";
import dayjs, { Dayjs, ManipulateType } from "dayjs";
import sharp, { AvailableFormatInfo, ResizeOptions } from "sharp";
import Documentos from "../models/Documentos";
import Empresas from "../models/Empresas";
import { socket } from "./socketClient";

/**
 * @function
 * @name encryptPassword
 * @description Función para obtener una contraseña y/o string encriptado.
 * @param password - Contraseña a encriptar
 * @param secretKey - Llave secreta para encriptar.
*/
export function encryptPassword(password: string, secretKey: string): string {
    try {
        const encrypted = CryptoJS.AES.encrypt(password, secretKey).toString();
        return encrypted;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name decryptPassword
 * @description Función para desencriptar una contraseña y/o string encriptado.
 * @param encryptedPassword - Contraseña/String encriptada
 * @param secretKey - Llave secreta para desencriptar.
*/
export function decryptPassword(encryptedPassword: string, secretKey: string): string {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name generarCodigoUnico
 * @description Función para códigos únicos apartir de una longitud dada, el valor.
 * @param length - Longitud del código a retornar.
 * @param onlyCode - Devuelve el código sin timestamp
*/
export function generarCodigoUnico(length: number = 5, onlyCode?: boolean): string {
    try {
        const input = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const input_length = input.length;
        let hash = '';
        for (let i = 0; i < length; i++) {
            hash += input.charAt(Math.floor(Math.random() * input_length));
        }
        return onlyCode ? hash : `${hash}${new Date().getTime()}`;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name cleanObject
 * @description Función para limpiar valores indefinidos de un objeto.
 * @param obj - Objeto a limpiar.
*/
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
    try {
        return Object
            .keys(obj)
            .filter(key => obj[key] !== undefined && obj[key] !== '' && obj[key] !== null)
            .reduce((acc, key) => {
                acc[key as keyof T] = obj[key as keyof T];
                return acc;
            }, {} as Partial<T>);
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name isEmptyObject
 * @description Función para validar si un objeto está vacío.
 * @param obj - Objeto a validar.
*/
export function isEmptyObject(obj: object): boolean {
    try {
        return Object.keys(obj).length === 0;
    } catch (error) {
        throw error;
    }
}

/**
 * @async
 * @function
 * @name formatearFecha
 * @description Función para formatear una fecha dada a "dd/mm/yyyy, hh:mm:ss"
 * @param fecha - Fecha a convertir
*/
export async function formatearFecha(fecha?: Date): Promise<string> {
    try {
        const config = await Configuracion.findOne({}, 'zonaHoraria');
        return new Intl.DateTimeFormat('es-MX', { timeZone: config?.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(fecha || Date.now()))
    } catch (error) {
        throw error
    }
}

/**
 * @async
 * @function
 * @name fomatoISO
 * @description Función para formatear una fecha dada a "yyyy-mm-dd hh:mm:ss"
 * @param fecha - Fecha a convertir
*/
export async function fomatoISO(fecha?: Date): Promise<string> {
    try {
        const config = await Configuracion.findOne({}, 'zonaHoraria');
        return new Intl.DateTimeFormat('sv', { timeZone: config?.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(fecha || Date.now()))
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name validacionRegistroActivo
 * @description Función para validar que un registro activo se encuentre en regla para poder marcar su acceso, validando sus tiempos y estatus actual.
 * @param registro - Registro a validar con base en el modelo de "Registros".
*/
export async function validacionRegistroActivo(
    registro: {
        fecha_entrada: Date,
        fecha_salida: Date,
        eventos: Array<{ tipo_check: number }>,
        estatus: number
    }
): Promise<[esValido: boolean, comentario: string]> {
    try {
        const { tiempoToleranciaSalida, tiempoToleranciaEntrada, tiempoCancelacionRegistros } = await Configuracion.findOne({}, 'tiempoToleranciaSalida tiempoToleranciaEntrada tiempoCancelacionRegistros') as IConfiguracion;
        const tiempoCancel = Number(tiempoCancelacionRegistros.split('/')[0]);
        const tiempoSalida = Number(tiempoToleranciaSalida.split('/')[0]);
        const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
        const tipoSalida = tiempoToleranciaSalida.split('/')[1] as ManipulateType;
        const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;
        const tipoCancel = tiempoCancelacionRegistros.split('/')[1] as ManipulateType;

        const fecha_actual = dayjs();
        const fecha_entrada = dayjs(registro.fecha_entrada).subtract(tiempoEntrada, tipoEntrada)
        const fecha_salida = registro.fecha_salida ? dayjs(registro.fecha_salida).add(tiempoSalida, tipoSalida).add(tiempoCancel, tipoCancel) : null
        const tolerancia_entrada = dayjs(registro.fecha_entrada).add(tiempoEntrada, tipoEntrada);

        const existeSalida = registro.eventos.find((item) => item.tipo_check === 6);
        let tipo_check = registro.estatus;

        let esValido = true;
        let comentario = '';

        if (((tipo_check === 2 || tipo_check === 11) || tipo_check === 4) && tolerancia_entrada.isBefore(fecha_actual) && !existeSalida) {
            esValido = false;
            comentario = 'Tu entrada se venció.';
        }
        if (fecha_entrada.isAfter(fecha_actual)) {
            esValido = false;
            comentario = 'Aún no puedes ingresar.';
        }
        if (fecha_salida) {
            if (fecha_salida.isBefore(fecha_actual) && (tipo_check === 4 || tipo_check === 6) && !existeSalida) {
                esValido = false;
                comentario = 'Ya no puedes ingresar debido a que tu horario ha concluido.';
            }
        }
        if (tipo_check === 1) {
            esValido = false;
            comentario = 'La visita aún no ha sido autorizada.';
        }
        if (tipo_check === 3) {
            esValido = false;
            comentario = 'La visita fue rechazada.';
        }
        if (tipo_check === 4) {
            esValido = false;
            comentario = 'El residente no ha validado su información para permitir el acceso.';
        }
        if (tipo_check === 3) {
            esValido = false;
            comentario = 'La visita fue rechazada.';
        }
        if (tipo_check === 8 || tipo_check === 12) {
            esValido = false;
            comentario = 'La visita fue cancelada.';
        }
        if (tipo_check === 9 || tipo_check === 10) {
            esValido = false;
            comentario = 'La visita fue finalizada.';
        }
        return [esValido, comentario];
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name guardarEventoNoValido
 * @description Función para validar que un rango de fechas se encuentre dentro de un mismo rango dado, por defecto siempre se valida con la fecha actual.
*/
export async function guardarEventoNoValido(
    img_evento: string,
    img_perfil: string,
    comentario: string,
    creado_por: Types.ObjectId | string | null,
    qr: string,
    id_registro?: Types.ObjectId | string | null,
    fecha_creacion?: Date | number | null,
    id_usuario?: Types.ObjectId | string | null,
    tipo_dispositivo?: number
): Promise<boolean> {
    try {
        const registro = await new Eventos({
            tipo_dispositivo: tipo_dispositivo || 2,
            img_evento,
            img_perfil,
            tipo_check: 0,
            creado_por,
            comentario,
            qr,
            id_usuario: id_usuario || null,
            id_registro: id_registro || null,
            fecha_creacion: fecha_creacion || Date.now(),
        })
        await registro.save();
        return true;
    } catch (error) {
        throw error;
    }
}

interface EventoRegistro {
    tipo_dispositivo: number,
    tipo_check: number,
    id_registro: Types.ObjectId | string,
    id_usuario?: Types.ObjectId | string | null,
    id_visitante?: Types.ObjectId | string | null,
    id_autorizado_por?: Types.ObjectId | string | null,
    id_acceso?: Types.ObjectId | string | null,
    id_panel?: Types.ObjectId | string | null,
    comentario?: string,
    motivo_cancelacion?: string,
    img_evento?: string,
    img_perfil?: string,
    qr?: string,
    fecha_creacion?: Date | string
}

/**
 * @function
 * @name cambiarEventoRegistro
 * @description Función para cambiar al próximo estatus del registro.
*/
export async function cambiarEventoRegistro({
    tipo_dispositivo,
    tipo_check,
    id_registro,
    id_usuario,
    id_visitante,
    id_autorizado_por,
    id_acceso,
    id_panel,
    comentario,
    motivo_cancelacion,
    img_evento,
    img_perfil,
    qr,
    fecha_creacion
}: EventoRegistro, options?: ProjectionType<IRegistro>): Promise<boolean | IRegistro> {
    try {
        let activo = (tipo_check === 8 || tipo_check === 9);
        const evento = new Eventos({
            tipo_dispositivo,
            tipo_check,
            id_registro,
            comentario: comentario || motivo_cancelacion,
            img_evento,
            img_perfil,
            qr,
            id_acceso: id_acceso || null,
            id_usuario: id_autorizado_por || null,
            id_visitante: id_visitante || null,
            id_panel: id_panel || null,
            creado_por: id_usuario,
            fecha_creacion: fecha_creacion || Date.now()
        });
        await evento.save();
        if ([5, 6].includes(tipo_check)) {
            socket.emit("eventos:nuevo-evento", {
                id_evento: evento._id
            });
        }
        const registro = await Registros.findByIdAndUpdate(
            id_registro,
            {
                $push: {
                    estatus: evento._id
                },
                $set: {
                    modificado_por: id_usuario,
                    fecha_modificacion: Date.now(),
                    activo: !activo,
                    motivo_cancelacion: motivo_cancelacion
                },
            },
            {
                new: true,
                projection:
                    options ? options :
                        {
                            codigo: 1,
                            estatus: 1,
                            tipo_registro: 1,
                            img_usuario: 1,
                            nombre: {
                                $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                            },
                            apellido_pat: 1,
                            apellido_mat: 1,
                            correo: 1,
                            telefono: 1,
                            tipo_ide: 1,
                            numero_ide: 1,
                            accesos: 1,
                            empresa: 1,
                            id_anfitrion: 1,
                            actividades: 1,
                            fecha_entrada: 1,
                            fecha_salida: 1,
                            comentarios: 1,
                            placas: 1,
                            desc_vehiculo: 1,
                            motivo_cancelacion: 1,
                            fecha_creacion: 1,
                            creado_por: 1,
                            fecha_modificacion: 1,
                            modificado_por: 1,
                            activo: 1,
                        }
            }).lean() as IRegistro
        if (registro) return registro;
        else return false;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name getDaysBetweenDates
 * @description Función para obtener los días entre dos fechas.
 * @param inicio - Fecha de inicio.
 * @param final - Fecha de fin.
*/
export async function getDaysBetweenDates(inicio: Date, final: Date): Promise<Date[]> {
    try {
        const fechas = [];
        for (let i = new Date(inicio).getTime(); i <= new Date(final).getTime(); i = new Date(i).getTime() + 86400000) {
            fechas.push(new Date(new Date(i).setHours(0, 0, 0, 0)));
        }
        return fechas;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name descomponerTiempo
 * @description Función para descomponer un tiempo en milisegundos en un objeto con años, meses, días, horas, minutos y segundos.
 * @param milisegundos - Valor en milisegundos para descomponer.
 */
export function descomponerTiempo(milisegundos: number): { anios: number, meses: number, dias: number, horas: number, minutos: number, segundos: number } {
    try {
        if (typeof milisegundos !== 'number' || milisegundos < 0) {
            throw new Error('El valor debe ser un número entero no negativo.');
        }

        const MILISEGUNDOS_EN_UN_SEGUNDO = 1000;
        const MILISEGUNDOS_EN_UN_MINUTO = MILISEGUNDOS_EN_UN_SEGUNDO * 60;
        const MILISEGUNDOS_EN_UNA_HORA = MILISEGUNDOS_EN_UN_MINUTO * 60;
        const MILISEGUNDOS_EN_UN_DIA = MILISEGUNDOS_EN_UNA_HORA * 24;
        const MILISEGUNDOS_EN_UN_MES = MILISEGUNDOS_EN_UN_DIA * 30; // Aproximado
        const MILISEGUNDOS_EN_UN_ANO = MILISEGUNDOS_EN_UN_MES * 12; // Aproximado

        const anios = Math.floor(milisegundos / MILISEGUNDOS_EN_UN_ANO);
        milisegundos %= MILISEGUNDOS_EN_UN_ANO;

        const meses = Math.floor(milisegundos / MILISEGUNDOS_EN_UN_MES);
        milisegundos %= MILISEGUNDOS_EN_UN_MES;

        const dias = Math.floor(milisegundos / MILISEGUNDOS_EN_UN_DIA);
        milisegundos %= MILISEGUNDOS_EN_UN_DIA;

        const horas = Math.floor(milisegundos / MILISEGUNDOS_EN_UNA_HORA);
        milisegundos %= MILISEGUNDOS_EN_UNA_HORA;

        const minutos = Math.floor(milisegundos / MILISEGUNDOS_EN_UN_MINUTO);
        milisegundos %= MILISEGUNDOS_EN_UN_MINUTO;

        const segundos = Math.floor(milisegundos / MILISEGUNDOS_EN_UN_SEGUNDO);

        return {
            anios,
            meses,
            dias,
            horas,
            minutos,
            segundos
        };
    } catch (error) {
        throw error;
    }
};

/**
 * @function
 * @name validarHorario
 * @description Función para obtener los días entre dos fechas.
 * @param id_horario - ID del horario a validar.
 * @param fecha_evento - Fecha del evento actual con el que se realizará la validación.
 * @param estatus_actual - Estatus del registro para realizar el cambio Entrada (5) o Salida(6).
*/
export async function validacionHorario(id_horario: Types.ObjectId | string, estatus_actual: number): Promise<{ comentario: string }> {
    try {
        let datos = {
            comentario: ''
        };
        const fecha_actual = dayjs();
        const horario = await Horarios.findById(id_horario);
        switch (fecha_actual.get("day")) {
            case 0:
                datos = validarHorarioDiaYHora(0, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            case 1:
                datos = validarHorarioDiaYHora(1, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            case 2:
                datos = validarHorarioDiaYHora(2, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            case 3:
                datos = validarHorarioDiaYHora(3, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            case 4:
                datos = validarHorarioDiaYHora(4, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            case 5:
                datos = validarHorarioDiaYHora(5, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            case 6:
                datos = validarHorarioDiaYHora(6, horario?.horario ?? [], estatus_actual, fecha_actual)
                break;
            default:
                break;
        }
        return datos;
    } catch (error) {
        throw error;
    }
}

function validarHorarioDiaYHora(dia: number, horario: IHorario['horario'], estatus: number, fecha_evento: Dayjs): { comentario: string, fecha_check?: Date | string } {
    try {
        let datos = {
            comentario: "",
            fecha_check: fecha_evento.toDate(),
        };
        const esNocturno = horario[dia].esNocturno;
        if (!esNocturno) {
            const entrada = horario[dia].entrada;
            const salida = horario[dia].salida;
            if (estatus == 5) {
                const fecha_entrada = dayjs().set("hours", entrada.hora).set("minutes", entrada.minuto)
                if (fecha_evento.isAfter(fecha_entrada)) {
                    datos = { comentario: 'Entrada después del tiempo de horario.', fecha_check: fecha_evento.toDate() };
                }
            }
            if (estatus == 6) {
                const fecha_salida = dayjs().set("hours", salida.hora).set("minutes", salida.minuto)
                if (fecha_evento.isBefore(fecha_salida)) {
                    datos = { comentario: 'Salida antes del tiempo de horario.', fecha_check: fecha_evento.toDate() };
                }
            }
        }
        else {
            const entrada = horario[dia].entrada;
            const salida = horario[dia].salida;
            if (estatus == 5) {
                const fecha_entrada = dayjs().set("hours", entrada.hora).set("minutes", entrada.minuto)
                if (fecha_evento.isAfter(fecha_entrada)) {
                    datos = { comentario: 'Entrada después del tiempo de horario.', fecha_check: fecha_evento.toDate() };
                }
            }
            if (estatus == 6) {
                const fecha_salida = dayjs().set("day", 1).set("hours", salida.hora).set("minutes", salida.minuto)
                if (fecha_evento.isBefore(fecha_salida)) {
                    datos = { comentario: 'Salida antes del tiempo de horario.', fecha_check: fecha_evento.toDate() };
                }
            }
        }
        return datos;
    } catch (error) {
        throw error;
    }
}

type SortOrder = "asc" | "desc";
type SortResponse = { [key: string]: 1 | -1 };

export function getMongoSort(querySort: { field: string; sort: 'asc' | 'desc' }[]): SortResponse | null {
    try {
        const sorting: Record<SortOrder, number> = {
            desc: -1,
            asc: 1,
        };
        if (querySort.length === 0) return null;
        // Construir el objeto de ordenamiento
        let object = querySort.reduce((obj, item) => {
            if (item.field.trim() !== "") {
                Object.assign(obj, { [item.field]: sorting[item.sort] });
            }
            return obj;
        }, {} as SortResponse);

        // Filtrar claves vacías
        object = Object.keys(object)
            .filter((key) => key.trim() !== "") // Eliminar claves vacías
            .reduce((acc, key) => {
                acc[key] = object[key];
                return acc;
            }, {} as SortResponse);

        return Object.keys(object).length > 0 ? object : null;
    } catch (error) {
        throw error;
    }
}

type OrConditions = { [key: string]: { $regex: string, $options: 'i' } };

type Agregation = {
    filter: OrConditions[] | [],
    sort: SortResponse | null,
    pagination: {
        skip: number,
        limit: number
    }
}

export function customAggregationForDataGrids(
    filter: QueryParams["filter"],
    sort: QueryParams["sort"],
    pagination: QueryParams["pagination"],
    matchingFields: string[]
): Agregation {
    const filtering = filter || [];
    const sorting = getMongoSort(sort || []);
    const page = parseInt(pagination?.page || '0') + 1;
    const limit = parseInt(pagination?.pageSize || '5');
    const skip = (page - 1) * limit;

    const orConditions: OrConditions[] = [];

    filtering.forEach(value => {
        matchingFields.forEach(field => {
            orConditions.push({
                [field]: { $regex: value, $options: 'i' }
            });
        });
    });
    return { filter: orConditions, sort: sorting, pagination: { skip, limit } };
}

export function columnToLetter(column: number): string {
    var temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}

type ArrayCompare = {
    correo: string;
    usuario: string;
    errores: Record<string, string>;
};

export function marcarDuplicados(arr: ArrayCompare[]): ArrayCompare[] {
    const correosMap = new Map<string, number[]>();
    const usuariosMap = new Map<string, number[]>();

    arr.forEach((item, index) => {
        if (item.correo) {
            if (!correosMap.has(item.correo)) correosMap.set(item.correo, []);
            correosMap.get(item.correo)!.push(index);
        }

        if (item.usuario) {
            if (!usuariosMap.has(item.usuario)) usuariosMap.set(item.usuario, []);
            usuariosMap.get(item.usuario)!.push(index);
        }
    });

    return arr.map((item, index) => {
        const errores: Record<string, string> = {};

        const indicesCorreo = correosMap.get(item.correo) || [];
        const indicesUsuario = usuariosMap.get(item.usuario) || [];

        const correosDuplicados = indicesCorreo.filter(i => i !== index);
        const usuariosDuplicados = indicesUsuario.filter(i => i !== index);

        if (correosDuplicados.length > 0) {
            errores.correo = `El correo se está repitiendo en la(s) fila(s): ${correosDuplicados.map(item => item + 2).join(", ")} de tu archivo.`;
        }

        if (usuariosDuplicados.length > 0) {
            errores.usuario = `El usuario se está repitiendo en las fila(s): ${usuariosDuplicados.map(item => item + 2).join(", ")} de tu archivo.`;
        }

        return Object.keys(errores).length > 0 ? { ...item, errores } : item;
    });
}

export async function resizeImage(base64Image: string, onlyTransform: boolean = false, targetWidth: number = 300, outputFormat: keyof sharp.FormatEnum | AvailableFormatInfo = "webp", options: ResizeOptions = {},) {
    try {
        if (!base64Image) return "";

        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const image = sharp(buffer);
        const metadata = await image.metadata();
        const mimeType = outputFormat
            ? `image/${outputFormat}`
            : metadata.format
                ? `image/${metadata.format}`
                : 'image/jpeg';

        if (outputFormat) {
            image.toFormat(outputFormat);
        }

        if (onlyTransform || metadata.width <= targetWidth) {
            const buffer = await image.toBuffer();
            const tranformedBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
            return tranformedBase64;
        }


        const targetHeight = Math.round((targetWidth / metadata.width) * metadata.height);

        const resizeOptions: ResizeOptions = {
            width: targetWidth,
            height: targetHeight,
            fit: "fill",
            ...options
        };
        if (outputFormat) {
            image.toFormat(outputFormat);
        }
        const resizedBuffer = await image
            .resize(resizeOptions)
            .toBuffer();

        const resizedBase64 = `data:${mimeType};base64,${resizedBuffer.toString('base64')}`;

        return resizedBase64;
    } catch (error) {
        console.error('Error al redimensionar la imagen:', error);
        throw error;
    }
}

export async function obtenerUltimoEvento(id_registro: string | Types.ObjectId, eventos: number[], id_acceso?: string | Types.ObjectId) {
    try {
        const registro = await Registros.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(id_registro)
                }
            },
            {
                $lookup: {
                    from: "eventos",
                    localField: "estatus",
                    foreignField: "_id",
                    as: "ultimo_evento",
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    id_acceso ? { id_acceso: new Types.ObjectId(id_acceso) } : {},
                                    eventos.length > 0 ? { tipo_check: { $in: eventos } } : {}
                                ]
                            }
                        },
                        { $project: { tipo_check: 1, id_acceso: 1, fecha_creacion: 1 } },
                        { $sort: { fecha_creacion: -1 } },
                        { $limit: 1 }
                    ],
                },
            },
            {
                $set: {
                    ultimo_evento: { $arrayElemAt: ["$ultimo_evento", 0] },
                },
            },
            {
                $set: {
                    ultimo_evento: "$ultimo_evento.tipo_check"
                },
            },
            {
                $project: {
                    ultimo_evento: 1
                }
            }
        ]);
        if (!registro[0]) {
            return { estado: false, mensaje: "Registro no encontrado." }
        }
        return { estado: true, datos: registro[0].ultimo_evento }
    } catch (error) {
        throw error;
    }
}

interface HorarioItem {
    _id: string | Types.ObjectId;
    tipo_registro: number;
    placas: string;
    desc_vehiculo: string;
    fecha_entrada: string;
}

interface DetalleVisitante {
    visit_actividades: string;
    visit_accesos: { identificador: string; modo: string }[],
    anfi_nombre: string;
    anfi_correo: string;
    horarios: HorarioItem[];
}

interface AgruparVisitanteGroup {
    visit_nombre: string;
    visit_correo: string;
    detalles: DetalleVisitante[];
}

interface AgruparVisitanteInputItem {
    _id: string | Types.ObjectId;
    visit_nombre: string;
    visit_correo: string;
    visit_actividades: string;
    visit_accesos: { identificador: string; modo: string }[],
    anfi_nombre: string;
    anfi_correo: string;
    tipo_registro: number;
    placas: string;
    desc_vehiculo: string;
    fecha_entrada: string;
}

export function agruparDataParaVisitante(inputArray: AgruparVisitanteInputItem[], busqueda: "visit_correo" | "visit_nombre"): AgruparVisitanteGroup[] {
    const grouped = inputArray.reduce<AgruparVisitanteGroup[]>((result, item) => {
        const existingGroup = result.find(group => group[busqueda] === item[busqueda]);
        if (existingGroup) {
            const existingAnfitrion = existingGroup.detalles.find(detalle => detalle.anfi_correo === item.anfi_correo);

            if (existingAnfitrion) {
                existingAnfitrion.horarios.push({
                    _id: item._id,
                    tipo_registro: item.tipo_registro,
                    placas: item.placas,
                    desc_vehiculo: item.desc_vehiculo,
                    fecha_entrada: item.fecha_entrada,
                });
            } else {
                existingGroup.detalles.push({
                    visit_actividades: item.visit_actividades,
                    visit_accesos: item.visit_accesos,
                    anfi_nombre: item.anfi_nombre,
                    anfi_correo: item.anfi_correo,
                    horarios: [{
                        _id: item._id,
                        tipo_registro: item.tipo_registro,
                        placas: item.placas,
                        desc_vehiculo: item.desc_vehiculo,
                        fecha_entrada: item.fecha_entrada,
                    }]
                });
            }
        } else {
            result.push({
                visit_nombre: item.visit_nombre,
                visit_correo: item.visit_correo,
                detalles: [{
                    visit_actividades: item.visit_actividades,
                    visit_accesos: item.visit_accesos,
                    anfi_nombre: item.anfi_nombre,
                    anfi_correo: item.anfi_correo,
                    horarios: [{
                        _id: item._id,
                        tipo_registro: item.tipo_registro,
                        placas: item.placas,
                        desc_vehiculo: item.desc_vehiculo,
                        fecha_entrada: item.fecha_entrada,
                    }]
                }]
            });
        }
        return result;
    }, []);
    return grouped.filter(item => item && typeof item === 'object' && Object.keys(item).length > 0);
}

interface HorarioAnfitrionItem {
    _id: string | Types.ObjectId;
    tipo_registro: number;
    placas: string;
    desc_vehiculo: string;
    fecha_entrada: string;
}

interface DetalleAnfitrion {
    visit_actividades: string;
    visit_empresa: string;
    visit_nombre: string;
    visit_correo: string;
    visit_telefono: string;
    visit_accesos: { identificador: string; modo: string }[],
    horarios: HorarioAnfitrionItem[];
}

interface AgruparAnfitrionGroup {
    anfi_nombre: string;
    anfi_correo: string;
    detalles: DetalleAnfitrion[];
}

interface AgruparAnfitrionInputItem {
    _id: string | Types.ObjectId;
    anfi_nombre: string;
    anfi_correo: string;
    visit_actividades: string;
    visit_empresa: string;
    visit_nombre: string;
    visit_correo: string;
    visit_telefono: string;
    visit_accesos: { identificador: string; modo: string }[],
    tipo_registro: number;
    placas: string;
    desc_vehiculo: string;
    fecha_entrada: string;
}
export function agruparDataParaAnfitrion(
    inputArray: AgruparAnfitrionInputItem[],
    busqueda: "anfi_correo" | "anfi_nombre"
): AgruparAnfitrionGroup[] {
    const grouped = inputArray.reduce<AgruparAnfitrionGroup[]>((result, item) => {
        const existingGroup = result.find(group => group[busqueda] === item[busqueda]);

        if (existingGroup) {
            const existingVisitante = existingGroup.detalles.find(detalle => detalle.visit_correo === item.visit_correo);

            if (existingVisitante) {
                existingVisitante.horarios.push({
                    _id: item._id,
                    tipo_registro: item.tipo_registro,
                    placas: item.placas,
                    desc_vehiculo: item.desc_vehiculo,
                    fecha_entrada: item.fecha_entrada,
                });
            } else {
                existingGroup.detalles.push({
                    visit_actividades: item.visit_actividades,
                    visit_empresa: item.visit_empresa,
                    visit_nombre: item.visit_nombre,
                    visit_correo: item.visit_correo,
                    visit_telefono: item.visit_telefono,
                    visit_accesos: item.visit_accesos,
                    horarios: [{
                        _id: item._id,
                        tipo_registro: item.tipo_registro,
                        placas: item.placas,
                        desc_vehiculo: item.desc_vehiculo,
                        fecha_entrada: item.fecha_entrada,
                    }]
                });
            }
        } else {
            result.push({
                anfi_nombre: item.anfi_nombre,
                anfi_correo: item.anfi_correo,
                detalles: [{
                    visit_actividades: item.visit_actividades,
                    visit_empresa: item.visit_empresa,
                    visit_nombre: item.visit_nombre,
                    visit_correo: item.visit_correo,
                    visit_telefono: item.visit_telefono,
                    visit_accesos: item.visit_accesos,
                    horarios: [{
                        _id: item._id,
                        tipo_registro: item.tipo_registro,
                        placas: item.placas,
                        desc_vehiculo: item.desc_vehiculo,
                        fecha_entrada: item.fecha_entrada,
                    }]
                }]
            });
        }

        return result;
    }, []);
    return grouped.filter(item => item && typeof item === 'object' && Object.keys(item).length > 0);
}

export async function consultarDocumentacion(id_visitante: string | Types.ObjectId, tipo?: number[]): Promise<{ _id: Types.ObjectId, tipo: number }[]> {
    try {
        const documentos = await Documentos.aggregate([
            {
                $match: {
                    $and: [
                        tipo && tipo?.length > 0 ? { tipo: { $in: tipo } } : {},
                        { creado_por: new Types.ObjectId(id_visitante), estatus: 3, activo: true }
                    ]
                }
            },
            {
                $project: {
                    tipo: 1
                }
            },
            {
                $sort: {
                    tipo: 1,
                    fecha_modfiicacion: -1
                }
            }
        ]);
        let hash: { [key: string]: boolean } = {};
        let arrSinDuplicaciones = documentos.filter(o => hash[o.tipo] ? false : hash[o.tipo] = true);
        return arrSinDuplicaciones;
    } catch (error) {
        throw error;
    }
}

export async function consultarDocumentacionEmpresa(id_anfitrion: string | Types.ObjectId): Promise<number[]> {
    try {
        const anfitrion = await Usuarios.findById(id_anfitrion, 'id_empresa');
        const empresa = await Empresas.findById(anfitrion?.id_empresa);
        return empresa?.documentos || [];
    } catch (error) {
        throw error;
    }
}

export function flattenErrors(input: unknown): Record<string, string> {
    const out: Record<string, string> = {};

    function recurse(node: unknown, path = ""): void {
        if (node === null || node === undefined) return;

        if (Array.isArray(node)) {
            node.forEach((item, idx) => recurse(item, path ? `${path}.${idx}` : String(idx)));
            return;
        }

        if (typeof node === "object") {
            const obj = node as Record<string, unknown>;
            const keys = Object.keys(obj);
            if (keys.length === 0) return;
            for (const k of keys) {
                const val = obj[k];
                const nextPath = path ? `${path}.${k}` : k;
                if (val !== null && typeof val === "object") {
                    recurse(val, nextPath);
                } else {
                    out[nextPath] = String(val);
                }
            }
            return;
        }

        // node es primitivo (string, number, boolean)
        if (path) out[path] = String(node);
    }

    recurse(input, "");
    return out;
}