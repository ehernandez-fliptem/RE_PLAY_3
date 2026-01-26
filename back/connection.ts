import mongoose from 'mongoose';
import TiposEventos from './models/TiposEventos';
import Roles from './models/Roles';
import TiposRegistros from './models/TiposRegistros';
import TiposDispositivos from './models/TiposDispositivos';
import TiposDocumentos from './models/TiposDocumentos';
import { CONFIG } from './config';

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('🔗 Conectado a la base de datos Flipbot');
        console.log('🔗 Validando catálogos para el funcionamiento del sistema');

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
            ]);
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
            ]);
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
