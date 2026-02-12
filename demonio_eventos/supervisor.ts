import { CONFIG } from './config';
import { fecha, log } from "./middlewares/log";
import { decryptPassword } from './utils/utils';
import { clienteAxios } from './axios';
import axios from 'axios';
import { EventInfo, EventProcess, IDispositivoHv } from './types/basic';
import dayjs from 'dayjs';

const regexIDGeneral = /^[\d]+$/;
const regexCodigo = /^[A-Za-z0-9]{18}$/;

let indexPaneles = 0;
let indexEventos = 0;
let eventosSync = 0;
const INITIAL_LOOKBACK_MINUTES = 5;
const SYNC_OVERLAP_SECONDS = 5;
const cursorPorPanel = new Map<string, Date>();

export async function main() {
    try {
        console.log("Iniciando demonio de eventos...");
        const res = await clienteAxios.get('/api/configuracion/integraciones');

        console.log("Integraciones obtenidas.");
        console.log(res.data.estado + " " + JSON.stringify(res.data.datos));

        if (res.data.estado) {
            const { habilitarIntegracionHv } = res.data.datos;
            if (habilitarIntegracionHv) {
                log(`${fecha()} 🔓​ Integración habilitada.\n`);
                log(`${fecha()} 🔑​ Verificando paneles.\n`);
                const res = await clienteAxios.get('/api/dispositivos-hikvision/demonio');
                if (res.data.estado) {
                    const paneles = res.data.datos;
                    if (paneles.length > 0) {
                        await sincronizarEventos(paneles);
                    }
                    else {
                        log(`${fecha()} 🔒  No hay paneles activos.\n`);
                    }
                }
            }
            else {
                log(`${fecha()} 🔒 Integración deshabilitada.\n`);
            }
        }

        log(`${fecha()} 🔄 Eventos sincronizados ${eventosSync}.\n`);
        eventosSync = 0;
        indexPaneles = 0;
        indexEventos = 0;
        log(`${fecha()} ✅ Supervisión terminada.\n\n`);
    } catch (error: any) {
        log(`${fecha()} ${error.name}: ${error.message}\n`);
        log(`${fecha()} ✅ Supervisión terminada por error.\n\n`);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await main()
    }
}

// Sincronización de eventos
const sincronizarEventos = async (paneles: IDispositivoHv[]) => {
    try {
        if (!paneles[indexPaneles]) {
            return;
        }
        const { _id, nombre, direccion_ip, usuario, contrasena, tipo_evento } = paneles[indexPaneles];
        const decryptPass = decryptPassword(contrasena, CONFIG.SECRET_CRYPTO)
        log(`${fecha()} 📱​ Dispositivo: ${nombre} - ${direccion_ip}\n`);
        let eventosPanel: EventInfo[] = [];
        const panelKey = String(_id);
        const fechaParcial = dayjs();
        const fechaCursor = cursorPorPanel.get(panelKey);
        const inicio = (fechaCursor
            ? dayjs(fechaCursor).subtract(SYNC_OVERLAP_SECONDS, "second")
            : fechaParcial.subtract(INITIAL_LOOKBACK_MINUTES, "minute")
        ).format("YYYY-MM-DD HH:mm:ss")
        const final = fechaParcial.add(1, "minute").format("YYYY-MM-DD HH:mm:ss")

        const panelInfo = {
            direccion_ip,
            usuario,
            contrasena: decryptPass
        }
        const datos = {
            inicio,
            final
        }
        log(`${fecha()} ⌛ Obteniendo eventos de rostro.\n`);
        const resAxiosRostro = await axios.post(`${CONFIG.URL_HYUNDAI}/api/panel/eventos/`, { datos: { ...datos, tipo_evento: 75 }, panel: panelInfo }, { headers: { "ngrok-skip-browser-warning": "69420" } });
        log(`${fecha()} ⌛ Obteniendo eventos de QR.\n`);
        const resAxiosQR = await axios.post(`${CONFIG.URL_HYUNDAI}/api/panel/eventos/`, { datos: { ...datos, tipo_evento: 1 }, panel: panelInfo }, { headers: { "ngrok-skip-browser-warning": "69420" } });
        log(`${fecha()} ⌛ Obteniendo eventos de QR.\n`);
        const resAxiosHuella = await axios.post(`${CONFIG.URL_HYUNDAI}/api/panel/eventos/`, { datos: { ...datos, tipo_evento: 38 }, panel: panelInfo }, { headers: { "ngrok-skip-browser-warning": "69420" } });
        if (resAxiosRostro.data.estado) eventosPanel = eventosPanel.concat(resAxiosRostro.data.datos);
        if (resAxiosQR.data.estado) eventosPanel = eventosPanel.concat(resAxiosQR.data.datos);
        if (resAxiosHuella.data.estado) eventosPanel = eventosPanel.concat(resAxiosHuella.data.datos);
        log(`${fecha()} 📅 Eventos totales del panel ${eventosPanel.length}.\n`);
        console.log("[DEMONIO][EVENTOS] rango:", { inicio, final });
        console.log("[DEMONIO][EVENTOS] total:", eventosPanel.length);
        const registros: EventProcess[] = eventosPanel
            .map((item) => {
                if (item) {

                    //console.log(item);
                    //console.log("Procesando evento de ID: " + item.employeeNoString);
                    // console.log("+**************************************");
                    // console.log("Resultado de regexIDGeneral test: " + regexIDGeneral.test(item.employeeNoString));
                    // console.log("+**************************************");

                    //if (regexIDGeneral.test(item.employeeNoString) || regexCodigo.test(item.employeeNoString)) {
                        const fechaCheck = new Date(item.time);
                        return { ID: item.employeeNoString, tipo_dispositivo: 3, fecha_creacion: fechaCheck, img_check: item.pictureURL || 'QR', tipo_check_panel: tipo_evento, id_panel: _id };
                    //}
                }
                return null;
            })
            .filter((item) => isEventProcess(item));
        const fechasEventos = registros
            .map((item) => dayjs(item.fecha_creacion))
            .filter((item) => item.isValid())
            .sort((a, b) => a.valueOf() - b.valueOf());
        const ultimoEvento = fechasEventos.length > 0 ? fechasEventos[fechasEventos.length - 1] : null;
        cursorPorPanel.set(panelKey, (ultimoEvento ?? fechaParcial).toDate());
        log(`${fecha()} ⚙️ Validando eventos del panel.\n`);
        indexEventos = 0

        //console.log("Registros a guardar: " + registros.length);
        //await new Promise(resolve => setTimeout(resolve, 1000));

        await guardarEventos(registros, usuario, decryptPass);
        indexPaneles++;
        await sincronizarEventos(paneles);
    } catch (error) {
        throw error;
    }
}

const guardarEventos = async (registros: EventProcess[], usuario: string, contrasena: string) => {
    try {
        if (!registros[indexEventos]) return;
        const img_check = registros[indexEventos].img_check;
        let img_base64: string = "";
        if (img_check !== "QR") {
            const res = await axios.post(`${CONFIG.URL_HYUNDAI}/api/panel/eventos/imagen`, { uri: img_check, usuario, contrasena }, { headers: { "ngrok-skip-browser-warning": "69420" } })
            if (res.data.estado) img_base64 = res.data.datos;
        }
        const res = await clienteAxios.post("/api/eventos/panel", { datos: { ...registros[indexEventos], img_check: img_base64 } });
        if (res.data.estado) {
            eventosSync++;
        }
        indexEventos++;
        await guardarEventos(registros, usuario, contrasena);
    } catch (error) {
        throw error;
    }
}

function isEventProcess(obj: any): obj is EventProcess {
    return obj && typeof obj.ID === 'string';
}

