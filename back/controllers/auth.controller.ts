import { Request, Response } from "express";
import { DecodedTokenUser } from '../types/jsonwebtoken';
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import Usuarios from "../models/Usuarios";
import Visitantes from "../models/Visitantes";
import { fecha, log } from "../middlewares/log";
import { UserRequest } from "../types/express";
import { CONFIG } from "../config";
import { REGEX_EMAIL } from "../utils/commonRegex";

interface SesionData {
    id_general: number;
    nombre: string;
    rol: number[];
    token: string;
    img_usuario: string;
}

export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { correo, contrasena } = req.body;
        const device_type = (req as UserRequest).device.type
        if (!REGEX_EMAIL.test(correo)) {
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.',
                mensajes: {
                    correo: !correo ? 'El correo es inválido.' : ''
                }
            });
            return;
        }
        if (!correo || !contrasena) {
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.',
                mensajes: {
                    correo: !correo ? 'El correo es obligatorio.' : '',
                    contrasena: !contrasena ? 'La contraseña es obligatoria.' : ''
                }
            });
            return;
        }
        let documento = null;
        documento = (await Usuarios.aggregate([
            { $match: { correo, activo: true }, },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos",
                    foreignField: "_id",
                    as: "accesos",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1,
                                identificador: 1
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    id_general: 1,
                    contrasena: 1,
                    rol: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                    },
                    apellido_pat: 1,
                    apellido_mat: 1,
                    img_usuario: 1,
                    intentos: 1,
                    esRoot: 1,
                    token_bloqueo: 1,
                    accesos: 1
                }
            }
        ]
        ))[0];

        documento = documento || (await Visitantes.aggregate([
            { $match: { correo, activo: true }, },
            {
                $project: {
                    id_general: 1,
                    contrasena: 1,
                    rol: 1,
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                    },
                    apellido_pat: 1,
                    apellido_mat: 1,
                    img_usuario: 1,
                    intentos: 1,
                    esRoot: 1,
                    token_bloqueo: 1,
                }
            }
        ]
        ))[0];

        if (!documento) {
            log(`${fecha()} LOGIN-REJECTED: Correo: ${correo} - Contraseña: ${contrasena}\n\n`);
            res.status(400).json({
                estado: false,
                mensaje: 'Revisa que los datos que estás ingresando sean correctos.',
                mensajes: {
                    correo: 'El correo no existe.',
                }
            });
            return;
        }

        const result = await bcrypt.compareSync(contrasena, documento.contrasena);
        const { intentos, token_bloqueo } = documento;

        if (token_bloqueo) {
            const validarInicio = await new Promise<{ estado: boolean, mensaje?: string, datos?: SesionData }>(async (resolve) => {
                jwt.verify(token_bloqueo, CONFIG.SECRET, async (err: any) => {
                    if (err && err.name === "TokenExpiredError") {
                        Promise.all([
                            await Usuarios.findOneAndUpdate(
                                { correo, activo: true },
                                { $set: { token_bloqueo: "", intentos: 5 } }
                            ),
                            await Visitantes.findOneAndUpdate(
                                { correo, activo: true },
                                { $set: { token_bloqueo: "", intentos: 5 } }
                            )
                        ])
                        if (result) {
                            resolve(await validarInicioSesion(documento, correo, contrasena, device_type));
                        } else {
                            Promise.all([
                                await Usuarios.findOneAndUpdate(
                                    { correo, activo: true },
                                    { $inc: { intentos: -1 } }
                                ),
                                await Visitantes.findOneAndUpdate(
                                    { correo, activo: true },
                                    { $inc: { intentos: -1 } }
                                )
                            ])
                            log(`${fecha()} LOGIN-REJECTED: Correo: ${correo} - Contraseña: ${contrasena}\n\n`);
                            resolve({
                                estado: false,
                                mensaje: `Credenciales inválidas. (${intentos - 1} intentos restantes.)`,
                            });
                        }
                    } else {
                        resolve({
                            estado: false,
                            mensaje:
                                "Su cuenta ha sido suspendida temporalmente, debe esperar 30 minutos para poder ingresar nuevamente.",
                        });
                    }
                });
            });
            res.status(validarInicio.estado ? 200 : 400).json(validarInicio);
            return;
        }

        if (intentos === 0) {
            const TOKEN = jwt.sign({ id: documento._id }, CONFIG.SECRET, { expiresIn: CONFIG.LIFE_TIME_RESTRICTED } as SignOptions);
            Promise.all([
                await Usuarios.findOneAndUpdate(
                    { correo, activo: true },
                    { $set: { token_bloqueo: TOKEN, intentos: 0 } }
                ),
                await Visitantes.findOneAndUpdate(
                    { correo, activo: true },
                    { $set: { token_bloqueo: TOKEN, intentos: 0 } }
                )
            ])
            res.status(200).json({
                estado: false,
                mensaje:
                    "Su cuenta ha sido suspendida temporalmente, debe esperar 30 minutos para poder ingresar nuevamente.",
            });
            return;
        }

        if (result) {
            Promise.all([
                await Usuarios.findOneAndUpdate(
                    { correo, activo: true },
                    { $set: { token_bloqueo: "", intentos: 5 } }
                ),
                await Visitantes.findOneAndUpdate(
                    { correo, activo: true },
                    { $set: { token_bloqueo: "", intentos: 5 } }
                )
            ])
            res.status(200).json(await validarInicioSesion(documento, correo, contrasena, device_type));
            return;
        }
        Promise.all([
            await Usuarios.findOneAndUpdate({ correo, activo: true }, { $inc: { intentos: -1 } }),
            await Visitantes.findOneAndUpdate({ correo, activo: true }, { $inc: { intentos: -1 } })
        ])
        log(`${fecha()} LOGIN-REJECTED: Correo: ${correo} - Contraseña: ${contrasena}\n\n`);
        res.status(200).json({
            estado: false,
            mensaje: `Credenciales inválidas. (${intentos - 1} intentos restantes.)`,
        });
    } catch (error: any) {
        const { correo, contrasena } = req.body;
        log(`${fecha()} LOGIN-REJECTED: Correo: ${correo} - Contraseña: ${contrasena}\n`);
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function logout(req: Request, res: Response): Promise<void> {
    try {
        const token = req.headers["x-access-token"] as string;
        const decoded = jwt.verify(token, CONFIG.SECRET) as DecodedTokenUser;
        const device_type = (req as UserRequest).device.type;

        if (!token) {
            res.status(200).json({ estado: false, mensaje: "Faltan datos." });
            return;
        }

        Promise.all([
            await Usuarios.findByIdAndUpdate(decoded.id, {
                $set: device_type === "desktop" ? { token_web: "" } : { token_app: "" },
            }),
            await Visitantes.findByIdAndUpdate(decoded.id, {
                $set: device_type === "desktop" ? { token_web: "" } : { token_app: "" },
            })
        ])
        log(`${fecha()} LOGOUT - TOKEN: Token: ${token}\n\n`);
        res.status(200).json({ estado: true });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

async function validarInicioSesion(
    documento: any,
    correo: string,
    contrasena: string,
    device_type: string
): Promise<{ estado: boolean; datos: SesionData }> {
    const TOKEN = jwt.sign({ id: documento._id }, CONFIG.SECRET, { expiresIn: CONFIG.LIFE_TIME } as SignOptions);
    const datos = {
        id_general: documento.id_general,
        nombre: documento.nombre,
        rol: documento.rol,
        token: TOKEN,
        esRoot: !!documento.esRoot,
        img_usuario: documento.img_usuario,
        accesos: documento.accesos || []
    } as SesionData;
    Promise.all([
        await Usuarios.findByIdAndUpdate(documento._id, {
            $set: device_type === "desktop" ? { token_web: TOKEN } : { token_app: TOKEN },
        }),
        await Visitantes.findByIdAndUpdate(documento._id, {
            $set: device_type === "desktop" ? { token_web: TOKEN } : { token_app: TOKEN },
        })

    ])
    log(`${fecha()} LOGIN: Correo: ${correo} - Contraseña: ${contrasena} - Dispositivo: ${device_type}\n`);
    log(`${fecha()} TOKEN: Token: ${TOKEN}\n\n`);
    return { estado: true, datos };
}