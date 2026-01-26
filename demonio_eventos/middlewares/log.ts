import fs from "fs";

const nameFileLog = () => {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(new Date()).split('/').reverse().join("_");
}

export const fecha = () => {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
}

export const log = (texto: string) => {
    fs.appendFile(`./logs/${nameFileLog()}.log`, texto, (error: unknown) => {
        if (error) {
            console.log(`Error al crear el log: ${error}`);
        }
    });
}