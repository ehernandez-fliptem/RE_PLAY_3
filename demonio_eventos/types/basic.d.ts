import { Types } from "mongoose";

export interface IDispositivoHv {
    _id: Types.ObjectId;
    nombre: string;
    direccion_ip: string;
    usuario: string;
    contrasena: string;
    habilitar_citas: boolean;
    tipo_evento: number;
}

export interface EventInfo {
    employeeNoString: string;
    time: number | string;
    pictureURL?: string;
}

export interface EventProcess {
    ID: string;
    tipo_dispositivo: number;
    fecha_creacion: string | Date | number;
    img_check: string;
    tipo_evento: number;
}