import FaceDescriptors from '../models/FaceDescriptors';
import * as faceapi from 'face-api.js';
import canvas from "canvas";
import sharp from 'sharp';
import { Types } from 'mongoose';
import os from 'os';
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

type Descriptor = {
    id_usuario?: Types.ObjectId | string | null;
    id_visitante?: Types.ObjectId | string | null;
    descriptor: number[];
};

export default class FaceDetector {
    async guardarDescriptorUsuario({
        id_usu_modif,
        id_usuario,
        id_visitante,
        img_usuario
    }: {
        id_usu_modif: Types.ObjectId | string | null;
        id_usuario?: Types.ObjectId | string;
        id_visitante?: Types.ObjectId | string;
        img_usuario?: string
    }): Promise<void> {
        try {
            let local_img = img_usuario;
            let local_user = id_usuario;
            let local_visit = id_visitante;

            if (!local_img) throw new Error('No se estableció la imagen.');
            if (!local_user && !local_visit) throw new Error('No se estableció al usuario o visitante.');

            const img = await this.#base64ToImageElement(local_img);
            const detections =
                await faceapi
                    .detectSingleFace(img as any, new faceapi.SsdMobilenetv1Options())
                    .withFaceLandmarks()
                    .withFaceDescriptor();
            if (detections) {
                if (local_user) {
                    const face_model_exist = await FaceDescriptors.find({ id_usuario: local_user }, '_id').limit(1);
                    if (face_model_exist[0]) {
                        await FaceDescriptors.findByIdAndUpdate(face_model_exist[0]._id, {
                            id_usuario: local_user,
                            descriptor: Array.from(detections.descriptor),
                            fecha_modificacion: Date.now(),
                            modificado_por: id_usu_modif,
                        });
                    } else {
                        const face_model = new FaceDescriptors({
                            id_usuario: local_user,
                            descriptor: Array.from(detections.descriptor),
                            fecha_creacion: Date.now(),
                            creado_por: id_usu_modif,
                        });
                        await face_model.save();
                    }
                }
                if (local_visit) {
                    const face_model_exist = await FaceDescriptors.find({ id_visitante: local_visit }, '_id').limit(1);
                    if (face_model_exist[0]) {
                        await FaceDescriptors.findByIdAndUpdate(face_model_exist[0]._id, {
                            id_visitante: local_visit,
                            descriptor: Array.from(detections.descriptor),
                            fecha_modificacion: Date.now(),
                            modificado_por: id_usu_modif,
                        });
                    } else {
                        const face_model = new FaceDescriptors({
                            id_visitante: local_visit,
                            descriptor: Array.from(detections.descriptor),
                            fecha_creacion: Date.now(),
                            creado_por: id_usu_modif,
                        });
                        await face_model.save();
                    }
                }
            } else {
                throw new Error('No se detectó un rostro en la imagen, vuelve a intentarlo con una imagen diferente.');
            }
        } catch (error) {
            throw error;
        }
    }

    async deshabilitarDescriptor({
        id_usu_modif,
        id_usuario
    }: {
        id_usu_modif: Types.ObjectId | string | null;
        id_usuario: Types.ObjectId | string;
    }): Promise<boolean> {
        try {
            const value = await FaceDescriptors.updateOne({ id_usuario }, {
                activo: false,
                fecha_modificacion: Date.now(),
                modificado_por: id_usu_modif,
            });
            return value.modifiedCount > 0;
        } catch (error) {
            throw error;
        }
    }

    async verificarAcceso(
        newDescriptor: number[],
        storedDescriptors: Descriptor[]
    ): Promise<{
        estado: boolean;
        id_usuario?: string | Types.ObjectId | null;
        id_visitante?: string | Types.ObjectId | null;
        similitud?: number;
    }> {
        const threshold = 0.85;
        // Usar el número óptimo de workers basado en los cores disponibles
        const numWorkers = Math.min(os.cpus().length || 4, 8);

        // Mejor división de segmentos
        const segmentSize = Math.ceil(storedDescriptors.length / numWorkers);
        const segmentos: Descriptor[][] = [];

        for (let i = 0; i < numWorkers; i++) {
            const start = i * segmentSize;
            const end = Math.min(start + segmentSize, storedDescriptors.length);
            if (start < storedDescriptors.length) {
                segmentos.push(storedDescriptors.slice(start, end));
            }
        }

        // Procesamiento en paralelo optimizado
        const resultados = await Promise.all(
            segmentos.map(segment =>
                this.#buscarCoincidenciaEnSegmento(newDescriptor, segment, threshold)
            )
        );

        // Encontrar la mejor coincidencia global
        let mejorResultado = resultados[0];
        for (let i = 1; i < resultados.length; i++) {
            if (resultados[i].distanciaMinima < mejorResultado.distanciaMinima) {
                mejorResultado = resultados[i];
            }
        }

        if (mejorResultado.idGeneral) {
            return {
                estado: true,
                id_usuario: mejorResultado.type === 1 ? mejorResultado.idGeneral : "",
                id_visitante: mejorResultado.type === 2 ? mejorResultado.idGeneral : "",
                similitud: mejorResultado.distanciaMinima
            };
        } else {
            return { estado: false };
        }
    }

    #buscarCoincidenciaEnSegmento(
        newDescriptor: number[],
        descriptorsSegment: Descriptor[],
        threshold: number
    ): { idGeneral: string | null; distanciaMinima: number; type: number } {
        let idGeneral: string | null = null;
        let distanciaMinima = Infinity;
        let type: 0 | 1 | 2 = 0;

        // Pre-calcular el descriptor una vez si es posible
        for (let i = 0; i < descriptorsSegment.length; i++) {
            const stored = descriptorsSegment[i];
            const distancia = faceapi.euclideanDistance(
                newDescriptor,
                Array.from(stored.descriptor)
            );

            // Buscar la MEJOR coincidencia, no cualquier coincidencia
            if (distancia < threshold && distancia < distanciaMinima) {
                distanciaMinima = distancia;
                idGeneral = String(stored.id_usuario) || String(stored.id_visitante);
                type = !!stored.id_usuario ? 1 : !!stored.id_visitante ? 2 : 0
            }
        }

        return { idGeneral, distanciaMinima, type };
    }

    async #base64ToImageElement(base64Image: string): Promise<InstanceType<typeof Image>> {
        return new Promise(async (resolve, reject) => {
            try {
                let imageBuffer: Buffer;
                const isWebP = base64Image.includes('data:image/webp') ||
                    base64Image.includes('image/webp');

                if (isWebP) {
                    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    imageBuffer = await sharp(buffer)
                        .jpeg({
                            quality: 100,
                            mozjpeg: true
                        })
                        .toBuffer();

                } else {
                    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
                    imageBuffer = Buffer.from(base64Data, 'base64');
                }

                const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(err);
                img.src = dataUrl;

            } catch (error) {
                reject(new Error(`Error en procesamiento de imagen: ${error}`));
            }
        });
    }
}