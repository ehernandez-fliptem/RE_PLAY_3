import { Model } from 'mongoose';
import { cleanObject } from '../utils/utils';
import { IRegistro } from '../models/Registros';
import { IAsignacion } from '../models/Asignaciones';
import { IConfiguracion } from '../models/Configuracion';
import { IDispositivoHv } from '../models/DispositivosHv';
import { IEvento } from '../models/Eventos';
import { IRecuperacion } from '../models/Recuperaciones';
import { IHorario } from '../models/Horarios';
import { IRol } from '../models/Roles';
import { ITipoEvento } from '../models/TiposEventos';
import { ITipoRegistro } from '../models/TiposRegistros';
import { IUsuario } from '../models/Usuarios';
import { IEmpresa } from '../models/Empresas';
import { IPase } from '../models/Pases';
import { IPiso } from '../models/Pisos';
import { IAcceso } from '../models/Accesos';
import { IVisitante } from '../models/Visitantes';
import { IDocumento } from '../models/Documentos';
import { IPuesto } from '../models/Puestos';
import { IFaceDescriptor } from '../models/FaceDescriptors';

/**
 * @function
 * @name validarModelo
 * @description Función para validar la creación de un usuario con base en el modelo de Usuarios.
 * @param {Model<*>} doc - Objeto creado a partir del modelos de Usuarios.
 * @param {boolean} isUpdate - Propiedad para validar los datos al actualizar los datos.
 * @returns {object} - Retorna un objeto con los mensajes de error establecidos en el modelo de Usuarios.
*/
export async function validarModelo(
    doc:
        IAsignacion | IConfiguracion | IDispositivoHv | IEvento |
        IEmpresa | IHorario | IRecuperacion | IRegistro | IRol | IPase |
        ITipoEvento | ITipoRegistro | IUsuario | IPiso | IPuesto | IAcceso | IVisitante |
        IDocumento | IFaceDescriptor
    ,
    isUpdate: boolean = false
): Promise<object> {
    try {
        const err = !isUpdate ? await doc.validate().then(() => null, (err: any) => err) : doc;
        let mensajes = {};
        if (err) {
            const entries = Object.entries(err.errors as Record<string, { message: string }>);
            const obj = entries.reduce((acc, curr) => { return { ...acc, [curr[0]]: curr[1].message } }, {});
            mensajes = obj
        }
        const mensajesLimpios = cleanObject(mensajes);
        return mensajesLimpios;
    } catch (error) {
        throw error;
    }
}