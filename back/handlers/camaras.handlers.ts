import { Server, Socket } from "socket.io";
import rtsp from 'rtsp-ffmpeg';
import { Types } from 'mongoose';
import { log, fecha } from "../middlewares/log";
import Camaras from "../models/Camaras";
const sala_token = "0usQha4B5(xwBEgs4}08JV=M5";
const sala_eventos = `camaras_${sala_token}`;


export default async function eventosHandlers(io: Server, socket: Socket): Promise<void> {
    const rol: number[] = socket?.data?.rol || [];
    const permitirAcceso: boolean = rol.includes(1);
    // const visitante_access = socket?.data.visitante_access || false;
    // if (!permitirAcceso && !visitante_access) {
    //     socket.disconnect();
    //     return;
    // }

    const obtenerVideoCamara = (payload: {
        usuario?: string;
        constrasena?: string;
    }) => {
        const uri = 'rtsp://freja.hiof.no:1935/rtplive/definst/hessdalen03.stream';
        const stream = new rtsp.FFMpeg({ input: uri });
    }

    const rooms = [permitirAcceso ? sala_eventos : ''];
    socket.join(rooms);
    // console.log("Conectado: ", socket.id, rooms);

    socket.on("camaras:obtener-video", obtenerVideoCamara);

    socket.on("disconnect", (reason) => {
        console.log(reason);
        rooms.forEach((room) => socket.leave(room))
    });
};