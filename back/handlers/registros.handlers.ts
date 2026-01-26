import { Server, Socket } from "socket.io";
import { Types } from 'mongoose';
import Registros, { IRegistro } from "../models/Registros";
import { log, fecha } from "../middlewares/log";
import { consultarDocumentacionEmpresa } from "../utils/utils";
import TiposDocumentos from "../models/TiposDocumentos";

const sala_token = "9gotyMzDAliybaxGW42q";
const sala_bitacora = `bitacora_${sala_token}`;

export default async function registrosHandlers(io: Server, socket: Socket): Promise<void> {
    const rol: number[] = socket?.data?.rol || [];
    const accesoBitacora: boolean = rol.includes(1) || rol.includes(2) || rol.includes(4) || rol.includes(5) || rol.includes(6) || rol.includes(7) || rol.includes(10);
    const visitante_access = socket?.data.visitante_access || false;
    // if (!accesoBitacora && !visitante_access) {
    //     socket.disconnect();
    //     return;
    // }

    const rooms = [(accesoBitacora || visitante_access) ? sala_bitacora : ''];
    socket.join(rooms);
    // console.log("Conectado: ", socket.id, rooms);

    const notificarNuevos = async (payload: { registros: string[] }): Promise<void> => {
        try {
            const { registros } = payload;
            const filterRegistrosCommon = await obtenerNuevosRegistros(registros);
            const room_sockets = await io.in(sala_bitacora).fetchSockets();
            for (const user_socket of room_sockets) {
                if (user_socket.data.visitante_access) continue;
                const registroFiltered = filtrarDatos(filterRegistrosCommon, { id_usuario: user_socket.data.id_usuario, rol: user_socket.data.rol, accesos: user_socket.data.accesos, esRoot: user_socket.data.esRoot, correoVisit: user_socket.data.correo })
                if (registroFiltered.length > 0) {
                    io.to(user_socket.id).emit("registros:notificar-nuevos", {
                        estado: true,
                        datos: registroFiltered.length,
                    });

                    io.to(user_socket.id).emit("registros:recibir-nuevos", {
                        estado: true,
                        datos: registroFiltered,
                    });
                }
            }
        } catch (error: any) {
            log(`${fecha()} ERROR: ${error.name} ${error.message}\n`);
        }
    };

    const modificarEstadoRegistro = async (payload: {
        id_registro: string;
    }): Promise<void> => {
        try {
            const { id_registro } = payload;
            const registro = await obtenerNuevosRegistros([id_registro]);
            const room_sockets = await io.in(sala_bitacora).fetchSockets();
            for (const user_socket of room_sockets) {
                if (user_socket.data.visitante_access) continue;
                const registroFiltered = filtrarDatos(registro, { id_usuario: user_socket.data.id_usuario, rol: user_socket.data.rol, accesos: user_socket.data.accesos, esRoot: user_socket.data.esRoot, correoVisit: user_socket.data.correo })
                io.to(user_socket.id).emit("registros:recibir-modificacion-estado", {
                    estado: true,
                    datos: registroFiltered[0],
                });
            }
        } catch (error: any) {
            log(`${fecha()} ERROR: ${error.name} ${error.message}\n`);
        }
    };

    socket.on("registros:notificar-nuevos", notificarNuevos);
    socket.on("registros:modificar-estado", modificarEstadoRegistro);

    socket.on("disconnect", (reason) => {
        console.log(reason);
        rooms.forEach((room) => socket.leave(room))
    });
};

const obtenerNuevosRegistros = async (registrosNuevos: string[]): Promise<any[]> => {
    try {
        const registros = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { _id: { $in: registrosNuevos.map((item) => new Types.ObjectId(item)) } },
                    ],
                },
            },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "id_anfitrion",
                    foreignField: "_id",
                    as: "anfitrion",
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "eventos",
                    localField: "estatus",
                    foreignField: "_id",
                    as: "eventos",
                    pipeline: [
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
                                acceso: { $arrayElemAt: ["$acceso", -1] },
                            },
                        },
                        {
                            $set: {
                                acceso: "$acceso.nombre"
                            },
                        },
                        { $project: { tipo_check: 1, id_acceso: 1, acceso: 1 } },
                    ],
                },
            },
            {
                $lookup: {
                    from: "documentos",
                    localField: "documentos",
                    foreignField: "_id",
                    as: "documentos",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                tipo: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    se_puede_finalizar: {
                        $cond: {
                            if: { $gt: [{ $size: "$accesos" }, 0] },
                            then: {
                                $reduce: {
                                    input: "$accesos",
                                    initialValue: true,
                                    in: {
                                        $and: [
                                            "$$value",
                                            {
                                                $let: {
                                                    vars: {
                                                        eventosAcceso: {
                                                            $filter: {
                                                                input: "$eventos",
                                                                as: "evento",
                                                                cond: {
                                                                    $eq: [
                                                                        "$$evento.id_acceso",
                                                                        "$$this.id_acceso"
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        entradas: {
                                                            $size: {
                                                                $filter: {
                                                                    input: "$eventos",
                                                                    as: "evento",
                                                                    cond: {
                                                                        $and: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.id_acceso",
                                                                                    "$$this.id_acceso"
                                                                                ]
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.tipo_check",
                                                                                    5
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        salidas: {
                                                            $size: {
                                                                $filter: {
                                                                    input: "$eventos",
                                                                    as: "evento",
                                                                    cond: {
                                                                        $and: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.id_acceso",
                                                                                    "$$this.id_acceso"
                                                                                ]
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$evento.tipo_check",
                                                                                    6
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    },
                                                    in: {
                                                        $and: [
                                                            { $gt: ["$$entradas", 0] }, // Debe haber al menos una entrada
                                                            { $gt: ["$$salidas", 0] }, // Debe haber al menos una salida
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            },
                            else: false,
                        }
                    }
                }
            },
            {
                $set: {
                    anfitrion: { $arrayElemAt: ["$anfitrion", -1] },
                    eventos: { $arrayElemAt: ["$eventos", -1] },
                },
            },
            {
                $set: {
                    anfitrion: "$anfitrion.nombre",
                    estatus: "$eventos.tipo_check",
                    acceso: "$eventos.acceso",
                    nombre: {
                        $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"]
                    },
                },
            },
            {
                $project: {
                    tipo_registro: 1,
                    nombre: 1,
                    correo: 1,
                    anfitrion: 1,
                    fecha_entrada: 1,
                    fecha_salida: 1,
                    estatus: 1,
                    accesos: 1,
                    acceso: 1,
                    activo: 1,
                    se_puede_finalizar: 1,
                    fecha_modificacion: 1,
                    documentos: 1,
                    id_anfitrion: 1
                },
            },
        ]);
        const results = [];
        for await (const item of registros) {
            const { documentos: docs, id_anfitrion } = item;
            const docsEmpresa = await consultarDocumentacionEmpresa(id_anfitrion);
            const docsFaltantesNum = docsEmpresa.filter((doc_emp) => !docs.some((doc: { tipo: number }) => doc.tipo === doc_emp));
            const docsFaltantes: string[] = [];
            for await (const doc of docsFaltantesNum) {
                const doc_name = await TiposDocumentos.findOne({ tipo: doc }, 'nombre');
                if (doc_name) {
                    docsFaltantes.push(doc_name.nombre)
                }
            }
            results.push({ ...item, docs_faltantes: docsFaltantes });
        }
        return results;
    } catch (error) {
        throw error;
    }
};

const filtrarDatos = (
    registros: IRegistro[],
    {
        id_usuario,
        rol,
        accesos,
        esRoot,
        correoVisit
    }:
        {
            id_usuario: Types.ObjectId | string,
            rol: number[],
            accesos: Types.ObjectId[] | string[],
            esRoot: boolean,
            correoVisit: string
        }
) => {
    try {
        const esAdmin = rol.includes(1);
        const esRecep = rol.includes(2);
        const esVisit = rol.includes(10);
        const filtrados = registros
            .filter(registro => {
                if (esVisit) {
                    if (registro.correo !== correoVisit) {
                        return false;
                    }
                }
                else {
                    if (esRecep && !esRoot) {
                        if (!registro.accesos || !registro.accesos.some(a => accesos.some((item) => String(a.id_acceso) === String(item)))) {
                            return false;
                        }
                    }

                    if (!esAdmin && !esRecep) {
                        if (!registro.id_anfitrion || String(registro.id_anfitrion) !== String(id_usuario)) {
                            return false;
                        }
                    }
                    if (!esRoot) {
                        if (!registro.id_anfitrion || (String(registro.id_anfitrion) != String(id_usuario))) {
                            return false;
                        }
                    }
                }
                return true;
            }).map((registro) => {
                const { accesos: accesosReg } = registro;
                let permitir_acceso = esVisit ? false :
                    (accesos.length > 0 &&
                        accesosReg.length > 0 &&
                        (esRoot && esRecep ? true : accesosReg.some(a =>
                            accesos.some((item) => String(a.id_acceso) === String(item))
                        )));

                return { ...registro, permitir_acceso, accesos: accesosReg.map((item) => item.id_acceso) };
            });
        return filtrados;
    } catch (error) {
        throw error;
    }
}