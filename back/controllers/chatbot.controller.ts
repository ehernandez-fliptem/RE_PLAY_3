import { Request, Response } from "express";
import { log, fecha } from "../middlewares/log";
import axios from 'axios';
import Registros, { IRegistro } from '../models/Registros';

const contextoModelos = `
1. Registros:
- codigo: string
- estatus: [ObjectId de eventos]
- tipo_registro: number
- nombre: string (Nombre de los visitantes)
- apellido_pat: string (Apellido paterno de los visitantes)
- apellido_mat: string (Apellido materno de los visitantes)
- correo: string
- telefono: string
- img_usuario: string (base64)
- tipo_ide: number
- img_ide_a: string (base64)
- img_ide_b: string (base64)
- numero_ide: string
- empresa: string
- id_pase: ObjectId de pases
- id_anfitrion: ObjectId de usuarios
- actividades: string
- fecha_entrada: Date
- fecha_salida: Date
- accesos: [{ id_acceso: ObjectId de accesos, modo: number }]
- comentarios: string
- placas: string
- desc_vehiculo: string
- motivo_cancelacion: string
- activo: boolean
2. Accesos:
- identificador: string
- nombre: string
- activo: boolean
3. Usuarios:
- usuario: string
- correo: string
- nombre: string
- apellido_pat: string
- apellido_mat: string
- id_empresa: ObjectId de empresas
- id_piso: ObjectId de pisos
- id_acceso: ObjectId de accesos
- activo: boolean
4. Pases:
- codigo: string
- fabricante: string
- modelo: string
- tipo: string
- vigente: boolean
- id_empresa: ObjectId de empresas
- activo: boolean
5. Eventos:
- tipo_dispositivo: number
- img_evento: string
- img_usuario: string
- qr: string
- tipo_check: number
- id_registro: ObjectId de registros
- id_horario: ObjectId de horarios
- id_acceso: ObjectId de accesos
- id_usuario: ObjectId de usuarios
- esAutorizado: number
- comentario: string
- fecha_creacion: Date
- activo: boolean
6. Tipo de Registros:
[
{ tipo: 1, nombre: 'Cita'},
{ tipo: 2, nombre: 'Registro'},
{ tipo: 3, nombre: 'Express'}
]
7. Tipo de Eventos:
[
{ tipo: 0, nombre: 'Inválido'},
{ tipo: 1, nombre: 'Pendiente'},
{ tipo: 2, nombre: 'Accedió'}, 
{ tipo: 5, nombre: 'Entrada'}, 
{ tipo: 6, nombre: 'Salida'}, 
{ tipo: 7, nombre: 'Indefinido'}, 
{ tipo: 8, nombre: 'Cancelada'}, 
{ tipo: 9, nombre: 'Finalizada'}, 
{ tipo: 10, nombre: 'Auto-Finalizada'}, 
{ tipo: 12, nombre: 'Auto-Cancelada'}
]
8. Tipo de Dispositivo: 
[
{ tipo: 1, nombre: 'Sistema'},
{ tipo: 2, nombre: 'QR'},
{ tipo: 3, nombre: 'Panel AC'},
{ tipo: 4, nombre: 'Móvil'}
]
`;

export async function enviarMensaje(req: Request, res: Response): Promise<void> {
    try {
        const { input } = req.body;
        const pipeline = await obtenerPipelineDeOllama(input, contextoModelos);
        const resultado = await Registros.aggregate(pipeline);
        const respuesta = await obtenerRespuestaHumana(input, resultado);
        res.status(200).json({ estado: true, datos: respuesta });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        res.status(500).send({ estado: false, mensaje: "Ocurrió un error inesperado." });
    }
}

async function obtenerPipelineDeOllama(pregunta: string, contextoModelos: string) {
    const prompt = `
Eres un experto en bases de datos MongoDB. 
Tu única responsabilidad es analizar la pregunta y generar un pipeline de agregación en MongoDB compatible con Mongoose, en formato JSON válido.
REQUISITOS ESTRICTOS:
- Devuelve solo el pipeline de agregación como un arreglo JSON válido para el modelo Registros.
- La respuesta debe comenzar con "[" y terminar con "]".
- No incluyas ningún texto adicional, explicación, salto de línea extra, formato Markdown ni encabezado. Cualquier contenido fuera del JSON hará que la respuesta sea inválida.
- No incluyas ningún tipo de comentario explicando el pipeline
- No uses funciones especiales como ISODate, NumberLong, ObjectId, etc. Solo utiliza sintaxis válida para JavaScript (por ejemplo, new Date("2024-01-01T00:00:00Z")).
- Si el pipeline incluye fechas, usa el objeto Date estándar de JavaScript.
- Utiliza los modelos proporcionados como referencia.
- El resultado debe estar en una sola línea si es posible.
MODELOS:
${contextoModelos}
Pregunta del usuario:
${pregunta}
`;
    const res = await axios.post("http://192.168.0.30:11434/api/generate", {
        model: "codellama:13b-instruct",
        prompt,
        stream: false
    });
    const match = res.data.response.match(/\[\s*{[\s\S]*?}\s*\]/)?.[0];
    if (!match) {
        throw new Error(res.data.response);
    }
    const pipeline = Function('"use strict"; return (' + match + ')')();
    return pipeline;
}

async function obtenerRespuestaHumana(pregunta: string, resultadoMongo: IRegistro[]) {
    const prompt = `
Pregunta del usuario: ${pregunta}
Resultado de la base de datos (JSON): ${JSON.stringify(resultadoMongo)}

Redacta una respuesta breve, clara y cordial para el usuario.

REQUISITOS ESTRICTOS:
- Si el resultado es un arreglo vacío [], responde exactamente: "No se encontraron resultados. Por favor, intenta nuevamente más tarde."
- Si el resultado contiene información, responde con una frase de máximo 50 caracteres, usando solo palabras simples y amables.
- No uses lenguaje técnico ni términos complejos.
- No incluyas explicaciones, disculpas ni comentarios adicionales.
- La respuesta debe ser directa y en tono positivo.
- Solo devuelve el texto final, sin comillas, sin formato Markdown y sin ningún otro contenido.
`;

    const res = await axios.post("http://192.168.0.30:11434/api/generate", {
        model: "gemma3:12b",
        prompt,
        stream: false
    });
    return res.data.response;
}