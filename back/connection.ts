import mongoose from 'mongoose';
import TiposEventos from './models/TiposEventos';
import Roles from './models/Roles';
import TiposRegistros from './models/TiposRegistros';
import TiposDispositivos from './models/TiposDispositivos';
import TiposDocumentos from './models/TiposDocumentos';
import Empleados from './models/Empleados';
import { CONFIG } from './config';

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('🔗 Conectado a la base de datos Flipbot');
        console.log('Validando catalogos para el funcionamiento del sistema');

        // Migracion: id_general -> id_empleado en empleados (una sola vez)
        await Empleados.updateMany(
            { id_empleado: { $exists: false }, id_general: { $exists: true } },
            [
                { $set: { id_empleado: "$id_general" } },
                { $unset: "id_general" }
            ]
        );

        const validarTiposEven = await TiposEventos.countDocuments();
        const validarRoles = await Roles.countDocuments();
        const validarTiposRegi = await TiposRegistros.countDocuments();
        const validarTiposDisp = await TiposDispositivos.countDocuments();
        const validarTiposDocs = await TiposDocumentos.countDocuments();

        if (validarTiposRegi === 0) {
            await TiposRegistros.insertMany([
                { tipo: 1, nombre: 'Cita', descripcion: "Visitas generales con previo aviso", color: "#008000" },
                { tipo: 2, nombre: 'Registro', descripcion: "Visitas que no cuentan con una cita", color: "#25569F" },
            ]);
        }
        if (validarTiposDocs === 0) {
            await TiposDocumentos.insertMany([
                { tipo: 1, nombre: 'Identificación oficial', descripcion: "Identificación oficial (INE, IFE, Licencia de conducir o Pasaporte)", color: "#00638E", extensiones: ["webp"] },
                { tipo: 2, nombre: 'SUA', descripcion: "Sitema Único de Determinación expedido por el IMSS", color: "#107A00", extensiones: ["pdf"] },
                { tipo: 3, nombre: 'Permiso de entrada', descripcion: "Permiso expedido para ingresar a las instalaciones", color: "#51008F", extensiones: ["pdf"] },
                { tipo: 4, nombre: 'Lista de artículos', descripcion: "Listado de artículos para la visita", color: "#892400", extensiones: ["pdf"] },
                { tipo: 5, nombre: 'REPSE', descripcion: "Registro de Prestadoras de Servicios Especializados u Obras Especializadas", color: "#1B5E20", extensiones: ["pdf"] },
                { tipo: 6, nombre: 'Soporte de pago actualizado', descripcion: "Comprobante de pago actualizado", color: "#0D47A1", extensiones: ["pdf"] },
                { tipo: 7, nombre: 'Constancia de Vigencia IMSS', descripcion: "Constancia de Vigencia de Derechos ante el IMSS", color: "#4E342E", extensiones: ["pdf"] },
                { tipo: 8, nombre: 'Constancias de Habilidades', descripcion: "Constancias de Habilidades Laborales aplicables", color: "#6A1B9A", extensiones: ["pdf"] },
            ]);
        }
        if (validarTiposDocs > 0) {
            const extras = [
                { tipo: 5, nombre: 'REPSE', descripcion: "Registro de Prestadoras de Servicios Especializados u Obras Especializadas", color: "#1B5E20", extensiones: ["pdf"] },
                { tipo: 6, nombre: 'Soporte de pago actualizado', descripcion: "Comprobante de pago actualizado", color: "#0D47A1", extensiones: ["pdf"] },
                { tipo: 7, nombre: 'Constancia de Vigencia IMSS', descripcion: "Constancia de Vigencia de Derechos ante el IMSS", color: "#4E342E", extensiones: ["pdf"] },
                { tipo: 8, nombre: 'Constancias de Habilidades', descripcion: "Constancias de Habilidades Laborales aplicables", color: "#6A1B9A", extensiones: ["pdf"] },
            ];
            for (const item of extras) {
                const existe = await TiposDocumentos.findOne({ tipo: item.tipo }, "_id").lean();
                if (!existe) await TiposDocumentos.create(item);
            }
        }
        if (validarTiposEven === 0) {
            await TiposEventos.insertMany([
                { tipo: 0, nombre: 'Inválido', color: "#3E3E3E" },
                { tipo: 1, nombre: 'Pendiente', color: "#857400" },
                { tipo: 5, nombre: 'Accedió', color: "#D64000" },
                { tipo: 6, nombre: 'Salida', color: "#00767A" },
                { tipo: 7, nombre: 'Indefinido', color: "#3DD9DB" },
                { tipo: 8, nombre: 'Cancelada', color: "#888888" },
                { tipo: 9, nombre: 'Finalizada', color: "#888888" },
                { tipo: 10, nombre: 'Auto-Finalizada', color: "#888888" },
                { tipo: 12, nombre: 'Auto-Cancelada', color: "#888888" },
            ]);
        }
        if (validarRoles === 0) {
            await Roles.insertMany([
                { rol: 1, nombre: 'Administrador', color: "#C50018" },
                { rol: 2, nombre: 'Recepción', color: "#0084E8" },
                { rol: 4, nombre: 'Interno', color: "#878787" },
                { rol: 5, nombre: 'Reportes', color: "#9F6C00" },
                { rol: 6, nombre: 'Asistencia', color: "#00AB64" },
                { rol: 7, nombre: 'Validador', color: "#850062" },
                { rol: 10, nombre: 'Visitante', color: "#1C344E" },
                { rol: 11, nombre: 'Contratista', color: "#2C6B2F" },
            ]);
        }
        if (validarRoles > 0) {
            const existeContratista = await Roles.findOne({ rol: 11 }, "_id").lean();
            if (!existeContratista) {
                await Roles.create({ rol: 11, nombre: 'Contratista', color: "#2C6B2F" });
            }
        }
        if (validarTiposDisp === 0) {
            await TiposDispositivos.insertMany([
                { tipo: 1, nombre: 'Sistema', color: "#456EBF" },
                { tipo: 2, nombre: 'QR', color: "#8245BF" },
                { tipo: 3, nombre: 'Panel AC', color: "#BF456A" },
               // { tipo: 4, nombre: 'Móvil', color: "#BF6A45" },
            ]);
        }
    } catch (error: any) {
        throw error;
    }
};


