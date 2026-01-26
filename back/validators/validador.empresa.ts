import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Empresas from "../models/Empresas";
import Usuarios from "../models/Usuarios";
import Accesos from "../models/Accesos";
import Pisos from "../models/Pisos";
import { log, fecha } from "../middlewares/log";

export async function modificarEmpValidador(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { pisos, accesos } = req.body;
        const pisosDesactivados = await Pisos.find({ _id: pisos.map((item: string) => new Types.ObjectId(item)), activo: false }, 'identificador');
        if (pisosDesactivados.length > 0) {
            res.status(200).json({ estado: false, mensaje: `Los siguientes pisos: ${pisosDesactivados.map((item) => item.identificador).join(', ')}, NO estan disponibles.` });
            return;
        }
        const accesosDesactivados = await Accesos.find({ _id: accesos.map((item: string) => new Types.ObjectId(item)), activo: false }, 'identificador');
        if (accesosDesactivados.length > 0) {
            res.status(200).json({ estado: false, mensaje: `Los siguientes accesos: ${accesosDesactivados.map((item) => item.identificador).join(', ')}, NO estan disponibles.` });
            return;
        }
        const validar_empresa = await Empresas.findById(req.params.id, 'accesos pisos');
        if (!validar_empresa) {
            res.status(200).json({ estado: false, mensaje: 'Empresa no encontrada.' });
            return;
        }
        let accesosPrevios = validar_empresa.accesos.map(a => a.toString());
        let accesosNuevos = accesos.map((a: any) => a.toString());
        let accesosEliminados = accesosPrevios.filter(a => !accesosNuevos.includes(a));

        if (accesosEliminados.length > 0) {
            const validar_usuarios = await Usuarios.countDocuments({ accesos: { $in: accesosEliminados.map((item) => new Types.ObjectId(item)) } });
            if (validar_usuarios > 0) {
                const accesosName = await Accesos.find({ _id: { $in: [...accesosEliminados].map((item) => new Types.ObjectId(item)) } }, 'identificador');
                res.status(200).json({ estado: false, mensaje: `Los siguientes accesos: ${accesosName.map((item) => item.identificador).join(', ')}, estan asignados a algunos usuarios, debes modificarlos antes de continuar.` });
                return;
            }
        }

        let pisosPrevios = validar_empresa.pisos.map(p => p.toString());
        let pisosNuevos = pisos.map((p: any) => p.toString());
        let pisosEliminados = pisosPrevios.filter(p => !pisosNuevos.includes(p));
        if (pisosEliminados.length > 0) {
            const validar_usuarios = await Usuarios.countDocuments({ id_piso: { $in: pisosEliminados.map((item) => new Types.ObjectId(item)) } });
            if (validar_usuarios > 0) {
                const pisosName = await Pisos.find({ _id: { $in: [...pisosEliminados].map((item) => new Types.ObjectId(item)) } }, 'identificador');
                res.status(200).json({ estado: false, mensaje: `Los siguientes pisos: ${pisosName.map((item) => item.identificador).join(', ')}, estan asignados a algunos usuarios, debes modificarlos antes de continuar.` });
                return;
            }
        }
        next();
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}