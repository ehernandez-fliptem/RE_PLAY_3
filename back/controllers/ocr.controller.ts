import { Request, Response } from 'express';
import tesseract from "node-tesseract-ocr"
import sharp from "sharp"
import { fecha, log } from "../middlewares/log";

const messages = {
    'extract_area: bad extract area': true
}

export async function obtenerDatos(req: Request, res: Response): Promise<void> {
    try {
        const { img } = req.body;
        if (!img) {
            res.status(200).json({ estado: false, mensaje: "No se recibió ninguna imagen" });
            return;
        }
        const img_buffer = Buffer.from(img.split('base64,')[1], 'base64');
        const image = await sharp(img_buffer)
            .greyscale()
            .extract({ width: 180, height: 40, left: 2, top: 110 })
            .resize({
                fit: 'inside'
            })
            .toBuffer()
        const config = {
            lang: "spa",
            oem: 3,
            psm: 1,
            dpi: 300
        }
        const texto = await tesseract.recognize(image, config);
        const patron = /(?:IDMEX)?(\d*)(?:<<)/;
        const match = texto.match(patron);
        if (match) {
            const valorNumerico = match[1];
            res.status(200).json({ estado: true, datos: valorNumerico });
            return;
        }
        res.status(200).json({ estado: false, mensaje: 'No se obtuvo información de la identificación.' });
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        if (messages[error.message as keyof typeof messages]) {
            res.status(200).send({ estado: false, mensaje: `Intenta que la imagen sea lo más nítida posible.` });
            return;
        }
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

export async function obtenerOCR(req: Request, res: Response): Promise<void> {
    try {
        const { img } = req.body;
        if (!img) {
            res.status(200).json({ estado: false, mensaje: "No se recibió ninguna imagen" });
            return;
        }
        const img_buffer = Buffer.from(img.split('base64,')[1], 'base64');
        const image = await sharp(img_buffer)
            .greyscale()
            .extract({ width: 200, height: 120, left: 110, top: 60 })
            .resize({
                width: 500,
                height: 300,
                fit: 'inside'
            })
            .toBuffer();
        const data = await tesseract.recognize(image, {
            lang: "spa",
            oem: 3,
            psm: 1,
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚñÑ',
            recto: "NOMBRE",
            dpi: 300
        });

        if (!data) {
            res.status(200).json({ estado: false, mensaje: 'Hubo un error al obtener los datos de la identificación.' })
            return;
        }
        let texto = '';
        let tipo_ide = 1;
        const palabrasEliminar: string[] = [];
        const formatData: string[] = data.split('\r\n').filter((item) => item)
        switch (tipo_ide) {
            case 1:
                palabrasEliminar.concat(["instituto", "nacional", "electoral", "mexico", "credencial", "para", "votar", "fecha", "nacimiento", "sexo", "domicilio", "clave", "elector", "curp", "estado", "municipio", "seccion", "localidad", "emision", "vigencia", "año", "registro"])
                texto = procesarTexto(formatData, ['NOMBRE'], ['FECHA', 'DOMICILIO', 'DOLO', 'DOMICILO', 'SEXO']);
                break;
            case 2:
                texto = procesarTexto(formatData, ['NOMBRE', 'NACIMIENTO', 'VOTAR'], ['EDAD', 'SEXO', 'DOMICILIO']);
                break;
            case 3:
                texto = procesarTexto(formatData, ['LICENCIA', 'No.'], ['EXPEDICIÓN', 'ANTIGUEDAD']);
                break;
            case 4:
                texto = procesarTexto(formatData, ['APELLIDO', 'SURNAME', 'PASSEPORT'], ['NACIONALIDAD', 'NATIONALITY']);
                break;
        }
        texto = eliminarCoincidencias(texto, palabrasEliminar);
        res.status(200).json({ estado: true, datos: texto })
    } catch (error: any) {
        log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
        if (messages[error.message as keyof typeof messages]) {
            res.status(200).send({ estado: false, mensaje: `${error.name}: Intenta que la imagen sea lo más nítida posible.` });
        }
        res.status(200).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
    }
}

// OCR
const procesarTexto = (data: string[], topReservadas: string[], bottomReservadas: string[]) => {
    let resultado = "";
    let cadenaDePalabras = data;
    let posicionTop = determinarTop(topReservadas, cadenaDePalabras);
    let posicionBottom = determinarBottom(bottomReservadas, cadenaDePalabras);
    if (posicionBottom < posicionTop) {
        var newBotRes = bottomReservadas;
        for (var i = 0; i < bottomReservadas.length; i++) {
            if (bottomReservadas[i] == cadenaDePalabras[posicionBottom]) {
                newBotRes.splice(i, 1);
                break;
            }
        }
        posicionBottom = determinarBottom(newBotRes, cadenaDePalabras);
    }
    for (var i = posicionTop; i < posicionBottom; i++) {
        if (existePalabraClaveEn(topReservadas, cadenaDePalabras[i]) && existePalabraClaveEn(bottomReservadas, cadenaDePalabras[i])) {
            resultado += cadenaDePalabras[i] + ' ';
        }
    }
    return resultado;
}

// const procesarTextoTrasero = (data, topReservadas, separador) => {
//     let resultado = "";
//     if (data.responses[0].fullTextAnnotation) {
//         let cadenaDePalabras = data.responses[0].textAnnotations;
//         let posicionTop = determinarTop(topReservadas, cadenaDePalabras);
//         resultado = cadenaDePalabras[posicionTop + 1].description.split(separador);
//         resultado = resultado[0];
//         return resultado;
//     } else {
//         return resultado;
//     }
// }

const existePalabraClaveEn = (cadenaDeClaves: string[], palabra: string) => {
    cadenaDeClaves.concat(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '/', 'NOMBRE', 'NAME', 'MEX']);
    let respuesta = true;
    cadenaDeClaves.forEach(clave => {
        if (palabra.toUpperCase().search(clave) != -1 || palabra.length == 1) {
            respuesta = false;
        }
    });
    return respuesta;
}

const determinarTop = (topReservadas: string[], cadenaDePalabras: string[]) => {
    let posicionTop = 0;
    for (let i = 0; i < topReservadas.length; i++) {
        for (let j = 0; j < cadenaDePalabras.length; j++) {
            if (cadenaDePalabras[j].toUpperCase().search(topReservadas[i]) != -1 && j > posicionTop) {
                posicionTop = j;
                break;
            }
        }
    }
    return posicionTop;
}

const determinarBottom = (bottomReservadas: string[], cadenaDePalabras: string[]) => {
    let posicionBottom = cadenaDePalabras.length;
    for (let i = 0; i < bottomReservadas.length; i++) {
        for (let j = 0; j < cadenaDePalabras.length; j++) {
            if (cadenaDePalabras[j].toUpperCase().search(bottomReservadas[i]) != -1 && j < posicionBottom) {
                posicionBottom = j;
                break;
            }
        }
    }
    return posicionBottom;
}

const eliminarCoincidencias = (cadena: string, palabrasAEliminar: string[]) => {
    palabrasAEliminar.forEach(palabra => {
        const regex = new RegExp('\\b' + palabra + '\\b', 'gi');
        cadena = cadena.replace(regex, '').replace(/\s+/g, ' ').trim();
    });
    return cadena;
}