import fs from "fs";
import path from "path";

const nameFileLog = () => {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(new Date()).split('/').reverse().join("_");
}

export const fecha = () => {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
}

export const log = (texto: string) => {
    const logsDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.appendFile(path.join(logsDir, `${nameFileLog()}.log`), texto, (error: unknown) => {
        if (error) {
            console.log(`Error al crear el log: ${error}`);
        }
    });
}
