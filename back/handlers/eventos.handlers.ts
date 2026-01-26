import { Server, Socket } from "socket.io";
import { Types } from 'mongoose';
import { log, fecha } from "../middlewares/log";
import Eventos from "../models/Eventos";

const sala_token = "DTcv~Qf,C8241.Q0lL]G13WwQ";
const sala_eventos = `eventos_${sala_token}`;

type IEvento = {
    id_empresa: string;
    img_usuario: string;
    anfitrion?: string;
    nombre: string;
    tipo_check: string;
    fecha_creacion: string;
    tipo_origen: 1 | 2;
    id_registro?: string;
    id_usuario?: string;
}

export default async function eventosHandlers(io: Server, socket: Socket): Promise<void> {
    const rol: number[] = socket?.data?.rol || [];
    const permitirAcceso: boolean = rol.includes(1) || rol.includes(2) || rol.includes(4) || rol.includes(5) || rol.includes(6) || rol.includes(7) || rol.includes(10);
    const visitante_access = socket?.data.visitante_access || false;
    // if (!permitirAcceso && !visitante_access) {
    //     socket.disconnect();
    //     return;
    // }

    const rooms = [(permitirAcceso || visitante_access) ? sala_eventos : ''];
    socket.join(rooms);
    // console.log("Conectado: ", socket.id, rooms);

    const nuevoEventoNoti = async (payload: {
        id_evento: string;
    }): Promise<void> => {
        try {
            const { id_evento } = payload;
            const filterRegistrosCommon = await obtenerEventos([id_evento]);
            const room_sockets = await io.in(sala_eventos).fetchSockets();
            for (const user_socket of room_sockets) {
                if (user_socket.data.visitante_access) continue;
                const registroFiltered = filtrarDatos(filterRegistrosCommon, { id_empresa: user_socket.data.id_empresa, esRoot: user_socket.data.esRoot })

                io.to(user_socket.id).emit("eventos:recibir-nuevo-evento", {
                    estado: true,
                    datos: registroFiltered[0],
                });
            }
        } catch (error: any) {
            log(`${fecha()} ERROR: ${error.name} ${error.message}\n`);
        }
    };

    socket.on("eventos:nuevo-evento", nuevoEventoNoti);

    socket.on("disconnect", (reason) => {
        console.log(reason);
        rooms.forEach((room) => socket.leave(room))
    });
};

const obtenerEventos = async (registrosNuevos: string[]): Promise<any[]> => {
    try {
        const registros = await Eventos.aggregate([
            {
                $match: {
                    $and: [
                        { _id: { $in: registrosNuevos.map((item) => new Types.ObjectId(item)) } },
                        { tipo_check: { $in: [5, 6, 7] } }
                    ],
                },
            },
            {
                $sort: {
                    id_registro: 1,
                    fecha_creacion: -1
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $and: [{ $ifNull: ["$id_registro", false] }, { $ne: ["$id_registro", null] }] },
                            { registro: "$id_registro" },
                            { usuario: "$id_usuario" }
                        ]
                    },
                    doc: { $first: "$$ROOT" },
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$doc"
                }
            },
            {
                $set: {
                    tipo_origen: {
                        $cond: [
                            { $and: [{ $ifNull: ["$id_registro", false] }, { $ne: ["$id_registro", null] }] },
                            2, // Visitante
                            1  // Usuario
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "registros",
                    localField: "id_registro",
                    foreignField: "_id",
                    as: "registro",
                    pipeline: [
                        {
                            $lookup: {
                                from: "usuarios",
                                localField: "id_anfitrion",
                                foreignField: "_id",
                                as: "anfitrion",
                                pipeline: [

                                    {
                                        $project: {
                                            id_empresa: 1,
                                            nombre: {
                                                $concat: ["$nombre", " ", "$apellido_pat", " ", { $ifNull: ["$apellido_mat", ""] }]
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $set: {
                                anfitrion: { $arrayElemAt: ["$anfitrion", 0] }
                            }
                        },
                        {
                            $project: {
                                id_empresa: "$anfitrion.id_empresa",
                                img_usuario: 1,
                                anfitrion: "$anfitrion.nombre",
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", { $ifNull: ["$apellido_mat", ""] }]
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_usuario",
                    foreignField: "_id",
                    as: "usuario",
                    pipeline: [
                        {
                            $project: {
                                id_empresa: 1,
                                img_usuario: 1,
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", { $ifNull: ["$apellido_mat", ""] }]
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "hikvision_dispositivos",
                    localField: "id_panel",
                    foreignField: "_id",
                    as: "panel",
                    pipeline: [
                        {
                            $project: {
                                nombre: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'accesos',
                    localField: 'id_acceso',
                    foreignField: '_id',
                    as: 'acceso',
                    pipeline: [{
                        $project: {
                            nombre: {
                                $concat: [
                                    '$identificador',
                                    ' - ',
                                    '$nombre'
                                ],
                            },
                        }
                    }],
                },
            },
            {
                $set: {
                    usuario: { $arrayElemAt: ["$usuario", -1] },
                    registro: { $arrayElemAt: ["$registro", -1] },
                    panel: { $arrayElemAt: ["$panel", -1] },
                    acceso: { $arrayElemAt: ["$acceso", -1] },
                }
            },
            {
                $set: {
                    panel: "$panel.nombre",
                    acceso: "$acceso.nombre",
                    generales: {
                        $cond: [
                            { $ifNull: ["$usuario", false] },
                            "$usuario",
                            "$registro"
                        ]
                    }
                }
            },
            {
                $set: {
                    img_usuario: "$generales.img_usuario",
                    anfitrion: "$generales.anfitrion",
                    nombre: "$generales.nombre",
                    id_empresa: "$generales.id_empresa"
                }
            },
            {
                $set: {
                    img_usuario: {
                        $cond: {
                            if: { $eq: ["$img_evento", ""] },
                            then: "$img_usuario",
                            else: "$img_evento"
                        }
                    },
                }
            },
            {
                $project: {
                    img_usuario: 1,
                    anfitrion: 1,
                    nombre: 1,
                    tipo_check: 1,
                    fecha_creacion: 1,
                    tipo_origen: 1,
                    panel: 1,
                    acceso: 1,
                    id_registro: 1,
                    id_usuario: 1
                }
            }
        ]);
        return registros;
    } catch (error) {
        throw error;
    }
};

const filtrarDatos = (
    registros: IEvento[],
    {
        id_empresa,
        esRoot,
    }:
        {
            id_empresa: Types.ObjectId | string,
            esRoot: boolean,
        }
) => {
    try {
        const filtrados = registros
            .filter(registro => {
                if (!esRoot) {
                    return String(id_empresa) === String(registro.id_empresa);
                }
                else {
                    return true;
                }
            })
        return filtrados;
    } catch (error) {
        throw error;
    }
}