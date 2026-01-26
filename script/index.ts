import * as faceapi from 'face-api.js';

import Usuarios from './models/Usuarios';
import FaceDetector from './classes/FaceDetector';
import { fecha, log } from './middlewares/log';
import { connectDB } from './connection';

const faceDetector = new FaceDetector();

async function loadModels() {
    return Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk("public/models"),
        faceapi.nets.faceLandmark68Net.loadFromDisk("public/models"),
        faceapi.nets.faceRecognitionNet.loadFromDisk("public/models"),
        faceapi.nets.faceExpressionNet.loadFromDisk("public/models"),
        faceapi.nets.ssdMobilenetv1.loadFromDisk("public/models")
    ])
}

async function agregarDescriptores() {
    try {
        const USUARIOS = await Usuarios.find({ activo: true, img_usuario: { $ne: "" } }, "img_usuario");
        for await (const usuario of USUARIOS) {
            const { _id: id_usuario, img_usuario } = usuario;
            try {
                log(`${fecha()} Usuario: ${id_usuario}\n`);
                await faceDetector.guardarDescriptorUsuario({ id_usu_modif: null, id_usuario: String(id_usuario), img_usuario })
            } catch (error: any) {
                log(`${fecha()} ERROR: ${id_usuario}: ${error.name}: ${error.message}\n`);
            }
        }
        // const VISITANTES = await Visitantes.find({ activo: true, img_usuario: { $ne: "" } }, "id_visitante img_usuario");
        // for await (const visitante of VISITANTES) {
        //     const { _id: id_vist, id_visitante, img_usuario } = visitante;
        //     try {
        //         console.log(`Visitante: ${id_visitante}`)
        //         await faceDetector.guardarDescriptorUsuario({ id_usu_modif: null, id_visitante: id_vist, img_usuario })
        //     } catch (error) {
        //         console.log(error)
        //         console.log(`Error con visitante: ${id_visitante}`)
        //     }
        // }
    } catch (error) {

    }
}

connectDB().then(() => {
    loadModels().then(async (_val) => {
        await agregarDescriptores();
    }).catch((err) => {
        console.log(err)
        log(`${fecha()} ERROR: No se pudieron cargar los modelos\n`);
    });
}).catch((err) => {
    console.log(err)
    log(`${fecha()} ERROR: No se pudieron cargar los modelos\n`);
});
