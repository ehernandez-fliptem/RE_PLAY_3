import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { DecodedTokenExternal, DecodedTokenUser } from '../types/jsonwebtoken';
import Recuperaciones from "../models/Recuperaciones";
import Usuarios from "../models/Usuarios";
import Visitantes from "../models/Visitantes";
import { fecha, log } from "../middlewares/log";
import { enviarCorreoRecuperarContrasena } from "../utils/correos";
import { CONFIG } from "../config";
import { generarCodigoUnico, isEmptyObject } from "../utils/utils";
import { validarModelo } from "../validators/validadores";

export async function enviarCodigo(req: Request, res: Response): Promise<void> {
    try {
        const { correo } = req.body;
        if (!correo) {
            res.status(400).json({
                estado: false,
                mensaje: 'Ocurrió un error inesperado.',
                mensajes: {
                    correo: 'El correo es obligatorio.',
                }
            });
        }

        const documento = await Usuarios.countDocuments({ correo }) || await Visitantes.countDocuments({ correo });
        if (documento === 0) {
            res.status(200).json({ estado: false, mensaje: "El correo no existe." });
            return;
        }

        const codigo = generarCodigoUnico(6, true).toUpperCase();
        const registro = new Recuperaciones({ correo, codigo, fecha_creacion: Date.now() });
        const mensajes = await validarModelo(registro);
        if (!isEmptyObject(mensajes)) {
            res.status(400).json({ estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes });
            return;
        }
        await Recuperaciones.updateMany({ correo: correo }, { activo: false })
        await registro.save();

        const response = await enviarCorreoRecuperarContrasena(correo, codigo);
        if (!response) {
            res.status(500).send({ estado: false, mensaje: "Hubo un error al enviar el correo." });
            return;
        }

        res.status(200).send({ estado: true });
    } catch (error: any) {
        console.error(error);
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function validarCodigo(req: Request, res: Response): Promise<void> {
    try {
        const { codigo } = req.body;
        if (!codigo) {
            res.status(400).json({
                estado: false,
                mensaje: 'Ocurrió un error inesperado.',
                mensajes: {
                    codigo: 'El código es obligatorio.',
                }
            });
            return;
        }

        const registro = await Recuperaciones.findOne({ codigo, activo: true }, "correo");
        if (!registro) {
            res.status(200).json({ estado: false, mensaje: "No existe una URL activa para actualizar la contraseña." });
            return;
        }

        const TOKEN = jwt.sign({ correo: registro.correo }, CONFIG.SECRET, { expiresIn: CONFIG.LIFE_TIME } as SignOptions);
        res.status(200).send({ estado: true, datos: TOKEN });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function modificarContrasena(req: Request, res: Response): Promise<void> {
    try {
        const { contrasena, confirm_contrasena, token } = req.body;
        const { correo } = jwt.verify(token, CONFIG.SECRET) as DecodedTokenExternal;

        if (!contrasena) {
            res.status(400).json({
                estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: {
                    contrasena: 'La contraseña es obligatoria.'
                }
            });
            return;
        }

        if (contrasena !== confirm_contrasena) {
            res.status(400).json({
                estado: false, mensaje: 'Revisa que los datos que estás ingresando sean correctos.', mensajes: {
                    confirm_contrasena: 'La contraseña debe coincidir con la primera.'
                }
            });
            return;
        }

        const abiertos = await Recuperaciones.findOne({ correo: correo, activo: true });
        if (!abiertos) {
            res.status(200).json({ estado: false, mensaje: "Ya no puedes actualizar tu contraseña con este código." });
            return;
        }

        const usuario = (await Usuarios.findOne({ correo: correo }, "_id")) || (await Visitantes.findOne({ correo: correo }, "_id"));
        if (!usuario) {
            res.status(200).json({ estado: false, mensaje: "El usuario no existe." });
            return;
        }

        const cerrados = await Recuperaciones.updateMany({ correo: correo }, { activo: false });
        if (cerrados.modifiedCount === 0) {
            res.status(200).json({ estado: false, mensaje: "No hay solicitudes de actualización por cerrar." });
            return;
        }

        const hash = await bcrypt.hashSync(contrasena, 10);
        if (!hash) {
            res.status(500).json({ estado: false, mensaje: 'Hubo un error al generar la contraseña.' });
            return;
        }
        await Usuarios.findOneAndUpdate(
            { _id: usuario._id },
            { contrasena: hash, fecha_modificacion: Date.now() }
        );
        await Visitantes.findOneAndUpdate(
            { _id: usuario._id },
            { contrasena: hash, fecha_modificacion: Date.now() }
        );
        await Recuperaciones.findOneAndUpdate(
            { correo },
            { fecha_modificacion: Date.now() },
            { sort: { fecha_creacion: -1 } }
        );

        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}