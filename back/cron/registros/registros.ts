import { Types } from "mongoose";
import dayjs, { ManipulateType } from 'dayjs';
import io from "socket.io-client";
import Eventos from "../../models/Eventos";
import Hikvision from "../../classes/Hikvision";
import Configuracion, { IConfiguracion } from "../../models/Configuracion";
import DispositivosHv, { IDispositivoHv } from "../../models/DispositivosHv";
import Registros, { IAccesoRegistro, IRegistro } from "../../models/Registros";
import { decryptPassword } from "../../utils/utils";
import { log, fecha } from "../../middlewares/log";

import { CONFIG } from "../../config";
import { socket } from '../../utils/socketClient';

type RegistrosAgg = {
    _id: Types.ObjectId;
    codigo: string;
    accesos: IAccesoRegistro[];
    fecha_salida: string | Date;
    fecha_entrada: string | Date;
    eventos: [{ tipo_check: number, fecha_creacion: string }];
    ultimo_evento: { tipo_check: number, fecha_creacion: string };
    tipo_registro: number;
}

export async function finalizarVencidos(): Promise<void> {
    try {
        const { tiempoCancelacionRegistros, tiempoToleranciaEntrada, habilitarIntegracionHv } = await Configuracion.findOne({}, 'tiempoCancelacionRegistros tiempoToleranciaEntrada habilitarIntegracionHv') as IConfiguracion;

        const tiempoEntrada = Number(tiempoToleranciaEntrada.split('/')[0]);
        const tiempoCancel = Number(tiempoCancelacionRegistros.split('/')[0]);
        const tipoEntrada = tiempoToleranciaEntrada.split('/')[1] as ManipulateType;
        const tipoCancel = tiempoCancelacionRegistros.split('/')[1] as ManipulateType;

        const fechaActual = dayjs();

        const toleCancel = dayjs.duration(tiempoCancel, tipoCancel);
        const lastToleCancel = dayjs.duration(14, "hour");
        const registrosCancel: RegistrosAgg[] = []
        const totalRegistros: RegistrosAgg[] = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { activo: true },
                    ]
                }
            },
            {
                $lookup: {
                    from: 'eventos',
                    localField: 'estatus',
                    foreignField: '_id',
                    as: 'eventos',
                    pipeline: [
                        { $project: { tipo_check: 1, fecha_creacion: 1 } },
                        { $limit: 10 }
                    ]
                }
            },
            {
                $set: {
                    ultimo_evento: { $arrayElemAt: ["$eventos", -1] },
                },
            },
            {
                $set: {
                    ultimo_check: "$ultimo_evento.tipo_check"
                }
            },
            {
                $project: {
                    id_registro: 1,
                    eventos: 1,
                    ultimo_evento: 1,
                    fecha_entrada: 1,
                }
            },
            {
                $sort: {
                    fecha_creacion: 1
                }
            },
        ]);
        for await (let item of totalRegistros) {
            const { _id: id_registro, eventos, fecha_entrada, ultimo_evento } = item;
            const existeActividad = eventos.some((item) => [6].includes(item.tipo_check));
            const tipo_check = !existeActividad ? 12 : 10;
            const evento = new Eventos({
                tipo_dispositivo: 1,
                tipo_check,
                id_registro: id_registro,
                fecha_creacion: Date.now(),
            });
            if (!existeActividad) {
                const isCancellable = dayjs(fechaActual).diff(dayjs(fecha_entrada).add(tiempoEntrada, tipoEntrada), "milliseconds") > toleCancel.asMilliseconds();
                if ([1].includes(ultimo_evento.tipo_check) && isCancellable) {
                    await evento.save().then(async () => {
                        registrosCancel.push(item);
                        await Registros.findByIdAndUpdate(id_registro, {
                            $push: {
                                estatus: evento._id
                            },
                            $set: { activo: false, fecha_modificacion: Date.now() }
                        });
                    });
                    socket.emit("registros:modificar-estado", {
                        id_registro: id_registro
                    });
                }
                const isCancellableEnt = dayjs(fechaActual).diff(dayjs(ultimo_evento.fecha_creacion).add(tiempoEntrada, tipoEntrada), "milliseconds") > lastToleCancel.asMilliseconds();
                if ([5].includes(ultimo_evento.tipo_check) && isCancellableEnt) {
                    await evento.save().then(async () => {
                        registrosCancel.push(item);
                        await Registros.findByIdAndUpdate(id_registro, {
                            $push: {
                                estatus: evento._id
                            },
                            $set: { activo: false, fecha_modificacion: Date.now() }
                        });
                    });
                    socket.emit("registros:modificar-estado", {
                        id_registro: id_registro
                    });
                }
            }
            if (existeActividad) {
                const isFinishable = dayjs(fechaActual).diff(dayjs(ultimo_evento.fecha_creacion).add(tiempoEntrada, tipoEntrada), "milliseconds") > toleCancel.asMilliseconds();
                if ([6].includes(ultimo_evento.tipo_check) && isFinishable) {
                    await evento.save().then(async () => {
                        registrosCancel.push(item);
                        await Registros.findByIdAndUpdate(id_registro, {
                            $push: {
                                estatus: evento._id
                            },
                            $set: { activo: false, fecha_modificacion: Date.now() }
                        });
                    });
                    socket.emit("registros:modificar-estado", {
                        id_registro: id_registro
                    });
                }
                const isCancellableEnt = dayjs(fechaActual).diff(dayjs(ultimo_evento.fecha_creacion).add(tiempoEntrada, tipoEntrada), "milliseconds") > lastToleCancel.asMilliseconds();
                if ([5].includes(ultimo_evento.tipo_check) && isCancellableEnt) {
                    await evento.save().then(async () => {
                        registrosCancel.push(item);
                        await Registros.findByIdAndUpdate(id_registro, {
                            $push: {
                                estatus: evento._id
                            },
                            $set: { activo: false, fecha_modificacion: Date.now() }
                        });
                    });
                    socket.emit("registros:modificar-estado", {
                        id_registro: id_registro
                    });
                }
            }
        }
        if (habilitarIntegracionHv) {
            for await (const reg of registrosCancel) {
                const registro = await Registros.findById(reg._id, 'codigo id_anfitrion') as IRegistro;
                const paneles = await DispositivosHv.find({ activo: true, habilitar_citas: true, tipo_check: { $ne: 0 }, id_acceso: { $in: reg.accesos.filter((item) => item.modo == 2).map((item) => item.id_acceso) } }) as IDispositivoHv[];
                for await (let panel of paneles) {
                    const { direccion_ip, usuario, contrasena } = panel as IDispositivoHv;
                    const decrypted_pass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO);
                    const HVPANEL = new Hikvision(direccion_ip, usuario, decrypted_pass);
                    await HVPANEL.deleteRegister(registro);
                }
            }
        }
    } catch (error: any) {
        log(`${fecha()} ERROR-CANCEL-REG ❌: ${error.name} ${error.message}\n\n`);
        throw error;
    }
}