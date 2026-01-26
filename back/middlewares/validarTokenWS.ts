import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Usuarios from "../models/Usuarios";
import Visitantes from "../models/Visitantes";
import { DecodedTokenUser } from '../types/jsonwebtoken';
import { fecha, log } from "./log";
import { CONFIG } from '../config';

export async function validarTokenWS(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
        const token = socket.handshake.auth.token;
        if (token === CONFIG.SECRET_TOKEN_SOCKET) {
            socket.data.visitante_access = true;
            return next();
        }
        const userExists = await isValidToken(token);
        if (userExists) {
            socket.data.id_usuario = userExists._id;
            socket.data.id_empresa = userExists.id_empresa;
            socket.data.rol = userExists.rol;
            socket.data.accesos = userExists.accesos;
            socket.data.esRoot = userExists.esRoot;
            socket.data.correo = userExists.correo;
            return next();
        }
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name} ${error.message}\n`);
        socket.disconnect();
        next(error);
    }
}

async function isValidToken(token: string): Promise<{ _id: string, id_empresa: string, rol: number[], activo: boolean, accesos: string[], esRoot: boolean, correo: string }> {
    try {
        const decoded = jwt.verify(token, CONFIG.SECRET) as DecodedTokenUser
        if (!token) throw new Error("La sesión ha expirado, por favor inicie sesión de nuevo.");

        let registro = null;
        registro = await Usuarios.findOne({ _id: decoded.id }, "rol accesos correo esRoot id_empresa activo");
        registro = registro || await Visitantes.findOne({ _id: decoded.id }, "rol correo activo");
        if (!registro) {
            throw new Error("Usuario no existe.")
        }
        if (!registro.activo) {
            throw new Error("Usuario inactivo.")
        }
        return {
            _id: registro._id,
            id_empresa: (registro as any).id_empresa || null,
            rol: registro.rol,
            activo: registro.activo,
            accesos: (registro as any).accesos || [],
            esRoot: !!(registro as any).esRoot,
            correo: registro.correo
        }
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            throw new Error("La sesión ha expirado, por favor inicie sesión de nuevo.")
        }
        throw new Error(error.message);
    }
};