import dayjs from "dayjs";
import fs from "fs";

const nameFileLog = () => {
    return dayjs().format("YY_MM_DD")
}

export const fecha = () => {
    return dayjs().format("DD/MM/YYYY, HH:mm:ss a")
}

export const log = (texto: string) => {
    fs.appendFile(`./logs/${nameFileLog()}.log`, texto, (error: unknown) => {
        if (error) {
            console.log(`Error al crear el log: ${error}`);
        }
    });
}