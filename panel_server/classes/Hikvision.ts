
import sharp from "sharp";
import fs from "fs";
import puppeteer, { HTTPResponse, Page } from 'puppeteer';
import { peticionGetImg, peticionGetPanel, peticionGetPanelNoAuth, peticionPostPanel, peticionPutImg, peticionPutPanel } from "../utils/requests_hv";
import dayjs, { Dayjs } from "dayjs";
import { EventInfoSearchResponse, UserInfoSavedResponse, UserInfoSearchResponse } from "../types/hikvision";
import path from "path";
import { PANEL_SELECTORS, PANEL_BY_IP } from "./Hikvision-selectors";
import { peticionPostCardCurl } from "../utils/requests_hv";


/////////////////////////
import { spawnSync } from "child_process";
/////////////////////////


const minimal_args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-notifications',
    '--start-maximized',
    '--window-size=1920,1080',
    '--proxy-server="direct://"',
    '--proxy-bypass-list=*'
];

interface IRegistroHV {
    employeeNo?: string;
    img_usuario?: string;
    id_general?: string | number;
    codigo?: string;
    nombre?: string;
    activo?: boolean;
    fecha_creacion?: Date | number | string;
    fechaCreacion?: Date | number | string;
    fecha_entrada?: Date | number | string;
    fecha_salida?: Date | number | string;
}

export default class Hikvision {
    private model: string = "default";
    ip: string;
    usuario: string;
    contrasena: string;
    token_hyundai?: string
    token: string
    web_session: string
    event_sync: number
    user_sync: number
    card_sync: number
    img_sync: number
    register_sync: number
    user_created: boolean
    user_modified: boolean
    user_deleted: boolean
    register_created: boolean
    register_modified: boolean
    register_deleted: boolean
    img_created: boolean
    img_modified: boolean
    img_deleted: boolean
    card_created: boolean
    /**
    * Create a point.
    * @param ip - Dirección ip del panel
    * @param usuario - Usuario para acceder al panel
    * @param contrasena - Contraseña para acceder al panel
    */
    constructor(ip: string, usuario: string, contrasena: string, token_hyundai?: string, token?: string, web_session?: string) {
        this.ip = ip;
        this.usuario = usuario;
        this.contrasena = contrasena;
        this.token_hyundai = token_hyundai;
        this.token = token || "";
        this.web_session = web_session || "";
        this.event_sync = 0;
        this.user_sync = 0;
        this.card_sync = 0;
        this.img_sync = 0;
        this.register_sync = 0;
        this.user_created = false;
        this.user_modified = false;
        this.user_deleted = false;
        this.register_created = false;
        this.register_modified = false;
        this.register_deleted = false;
        this.img_created = false;
        this.img_modified = false;
        this.img_deleted = false;
        this.card_created = false;
        // Detectar modelo automáticamente desde PANEL_BY_IP
        const panel = PANEL_BY_IP[ip];
        this.model = panel ? panel : "default";
    }

    getSyncedValues() {
        return {
            event_sync: this.event_sync,
            user_sync: this.user_sync,
            card_sync: this.card_sync,
            img_sync: this.img_sync,
            register_sync: this.register_sync
        }
    }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async getTokenValue() {
    try {
        if (!this.token || !this.web_session) {
            const { webSession, tokenValue } = await this.#getLoginCookie();
            this.web_session = webSession;
            this.token = tokenValue || "";
        }
        console.log("[HV] getTokenValue: token?", !!this.token, "web_session?", !!this.web_session);

        if (!this.token || !this.web_session) {
            console.log("[HV] No hay sesión en memoria -> haciendo login (puppeteer)");
            const { webSession, tokenValue } = await this.#getLoginCookie();
            this.web_session = webSession;
        this.token = tokenValue || "";
        } else {
        console.log("[HV] Reusando sesión existente (sin puppeteer)");
        }

    } catch (error) {
        throw error;
    }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async testConnection() {
        try {
            const url = `http://${this.ip}/ISAPI/System/deviceInfo`;
            const respuesta = await peticionGetPanel(url, this.usuario, this.contrasena);
            return !!respuesta;
        } catch (error) {
            throw error;
        }
    }

    #getCardType() {
        // Paneles nuevos
        if (["DS_K1T342EFWX_E1"].includes(this.model)) {
            return "remoteCard"; // ← QR correcto para tu lector
        }

        // Paneles viejos
        return "normalCard";
    }

    /**
     * Convertir imagen base64 a Buffer JPEG (en memoria)
     * - Acepta "data:image/...;base64,...." o solo "...."
     */
    async #base64ToJpegBuffer(base64Data: string): Promise<Buffer> {
    const raw = base64Data.includes(",") ? (base64Data.split(",").pop() || "") : base64Data;
    const inputBuffer = Buffer.from(raw, "base64");

    // Normalizamos a JPEG para evitar problemas de formato al subir
    return sharp(inputBuffer).jpeg().toBuffer();
    }

    async saverUser(registro: IRegistroHV) {
        try {
            console.log("Ya termina JD!!!!!!!");

            // =========================
            // 1) Datos de entrada
            // =========================
            const { img_usuario, id_general, nombre, activo, fecha_creacion } = registro;

            const employeeNo = String(id_general);
            const fpid = String(id_general);
            const fechaCreacion = dayjs(fecha_creacion).format("YYYY-MM-DDTHH:mm:ss");

            // =========================
            // 2) Imagen (Buffer) - SOLO si: activo && img_usuario
            // =========================
            const hasImage = Boolean(activo && img_usuario);
            const imageBuffer = hasImage ? await this.#base64ToJpegBuffer(img_usuario as string) : null;
            const imageName = `img_${employeeNo}.jpg`;

            // =========================
            // 3) Buscar usuario por EmployeeNo
            // =========================
            const urlUserSearch = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;

            const dataUserSearch = {
            UserInfoSearchCond: {
                searchID: "2B87C87F-3573-4DBD-B0FD-492A36C96C2D",
                maxResults: 1,
                searchResultPosition: 0,
                EmployeeNoList: [{ employeeNo }],
            },
            };

            const userByID = (await peticionPostPanel(
            urlUserSearch,
            dataUserSearch,
            this.usuario,
            this.contrasena
            )) as UserInfoSearchResponse;

            // =========================
            // 4) NO existe -> crear usuario + tarjeta + cara
            // =========================
            if (userByID.UserInfoSearch.totalMatches === 0) {
            // 4.1 URLs
            const urlUserRecord = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;
            const urlCardRecord = `http://${this.ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
            const urlFaceRecord = `http://${this.ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

            // 4.2 Payloads
            const dataUserRecord = {
                UserInfo: {
                employeeNo,
                name: nombre,
                userType: activo ? "normal" : "blackList",
                localUIRight: false,
                Valid: {
                    enable: true,
                    beginTime: fechaCreacion,
                    endTime: "2037-12-31T23:59:59",
                    timeType: "local",
                },
                doorRight: "1",
                RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
                userVerifyMode: "",
                },
            };

            const dataCard = {
                CardInfo: {
                    employeeNo: String(id_general),
                    cardNo: String(id_general),
                    cardType: this.#getCardType(),
                },
                };

            // 4.3 Crear usuario
            const resUser = (await peticionPostPanel(
                urlUserRecord,
                dataUserRecord,
                this.usuario,
                this.contrasena
            )) as UserInfoSavedResponse;
            
            if (resUser.statusString === "OK") {
                this.user_created = true;
                this.user_sync++;
            }
            
            // 4.4 Crear tarjeta (si tu panel da error aquí, déjalo comentado)
            try {
                const resCard = await peticionPostCardCurl(urlCardRecord, this.usuario, this.contrasena, dataCard);

                if (typeof resCard === "string") {
                    console.log("Hikvision (CardInfo) respondió texto:", resCard);
                    // Si quieres, aquí puedes detectar strings típicos de error
                } else {
                    if (resCard.statusString === "OK") {
                    this.card_created = true;
                    this.card_sync = this.card_sync + 1;
                    console.log("OK: Tarjeta creada correctamente.");
                    } else {
                    console.error("Error creando tarjeta (JSON):", resCard);
                    }
                }
                } catch (err: any) {
                console.error("Error creando tarjeta (curl):", err?.message || err);
                }
            // Mantengo tu comportamiento anterior: si el alta de usuario fue OK, contamos tarjeta.
            if (resUser.statusString === "OK") {
                this.card_created = true;
                this.card_sync++;
            }

            // 4.5 Subir cara (aquí ya va bien la firma)
            if (hasImage && imageBuffer) {
                const resp = await peticionPutImg(
                urlFaceRecord,
                this.usuario,
                this.contrasena,
                employeeNo,
                fpid,
                imageBuffer,
                imageName
                );

                // Caso A: el equipo respondió TEXTO
                if (typeof resp === "string") {
                if (resp.includes("deviceUserAlreadyExistFace")) {
                    console.log("La cara ya existe. Este firmware no permite reemplazarla.");
                } else {
                    console.log("Hikvision respondió texto:", resp);
                }
                } else {
                // Caso B: JSON ISAPI
                if (resp.statusString === "OK") {
                    this.img_created = true;
                    this.img_sync++;
                } else if (resp.statusString === "deviceUserAlreadyExistFace") {
                    console.log("La cara ya existe. Este firmware no permite reemplazarla.");
                } else {
                    console.error("Hikvision respondió un error:", resp);
                }
                }
            }
            }

            // =========================
            // 5) Existe -> modificar (tu lógica actual)
            // =========================
            else {
            const { employeeNo: empExist, name, userType, numOfFace } = userByID.UserInfoSearch.UserInfo[0];

            const needsUpdate =
                !(empExist === employeeNo &&
                ((userType === "normal" && activo) || (userType === "blackList" && !activo)) &&
                name === nombre);

            if (needsUpdate) {
                const urlUserModify = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;

                const dataUserModify = {
                UserInfo: {
                    employeeNo,
                    name: nombre,
                    userType: activo ? "normal" : "blackList",
                    localUIRight: false,
                    Valid: {
                    enable: true,
                    beginTime: fechaCreacion,
                    endTime: "2037-12-31T23:59:59",
                    timeType: "local",
                    },
                    doorRight: "1",
                    RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
                    userVerifyMode: "",
                },
                };

                const res = (await peticionPutPanel(
                urlUserModify,
                dataUserModify,
                this.usuario,
                this.contrasena
                )) as UserInfoSavedResponse;

                if (res.statusString === "OK") {
                this.user_modified = true;
                this.user_sync++;
                }
            }

            // Subir/actualizar cara si viene imagen
            if (hasImage && imageBuffer) {
                const urlFaceRecord = `http://${this.ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;
                const urlFaceDelete = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
                const dataFaceDelete = { faceLibType: "blackFD", FDID: "1", FPID: employeeNo, deleteFP: true };

                const uploadFace = async () =>
                    peticionPutImg(
                        urlFaceRecord,
                        this.usuario,
                        this.contrasena,
                        employeeNo,
                        fpid,
                        imageBuffer,
                        imageName
                    );

                const resp = await uploadFace();
                const respText = typeof resp === "string" ? resp : resp.statusString;

                if (respText === "OK") {
                    this.img_modified = true;
                    this.img_sync++;
                } else if (respText === "deviceUserAlreadyExistFace") {
                    const resDel = (await peticionPutPanel(
                        urlFaceDelete,
                        dataFaceDelete,
                        this.usuario,
                        this.contrasena
                    )) as UserInfoSavedResponse;

                    if (resDel.statusString === "OK") {
                        const respRetry = await uploadFace();
                        const respRetryText =
                            typeof respRetry === "string" ? respRetry : respRetry.statusString;
                        if (respRetryText === "OK") {
                            this.img_modified = true;
                            this.img_sync++;
                        } else {
                            console.error("Hikvision respondiÃ³ un error:", respRetry);
                        }
                    }
                } else {
                    console.error("Hikvision respondiÃ³ un error:", resp);
                }
            }

            // Borrar cara si aplica (tu regla actual)
            if (numOfFace === 1 && !img_usuario && activo) {
                const urlFaceDelete = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
                const dataFaceDelete = { faceLibType: "blackFD", FDID: "1", FPID: employeeNo, deleteFP: true };

                const resDel = (await peticionPutPanel(
                urlFaceDelete,
                dataFaceDelete,
                this.usuario,
                this.contrasena
                )) as UserInfoSavedResponse;

                if (resDel.statusString === "OK") {
                this.img_modified = true;
                this.img_sync++;
                }
            }
            }

            // =========================
            // 6) Resultado
            // =========================
            return {
            user_created: this.user_created,
            user_modified: this.user_modified,
            card_created: this.card_created,
            img_created: this.img_created,
            img_modified: this.img_modified,
            };
        } catch (error) {
            throw error;
        }
        }


    async deleteUser(registro: IRegistroHV) {
        try {
            const { id_general } = registro;
            const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Delete?format=json`; // Elimina por completo el usuario y su info
            const dataUser = {
                UserInfoDelCond: {
                    "EmployeeNoList": [{ "employeeNo": id_general }]
                }
            }
            const res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena) as UserInfoSavedResponse;
            if (res.statusString === 'OK') {
                this.img_deleted = true;
                this.user_sync = this.user_sync + 1;
            }
            return { user_deleted: this.user_deleted };
        } catch (error) {
            throw error;
        }
    }

    async saveRegister(registro: IRegistroHV) {
        try {
            const { img_usuario, codigo, nombre, activo, fecha_entrada, fecha_salida } = registro;
            const readStreamIMG = (activo && img_usuario) ? await this.#base64ToReadStream(img_usuario, `temp/img_${codigo}.jpg`) : '';
            const urlUsers = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
            const dataUser = {
                UserInfoSearchCond: {
                    searchID: "2B87C87F-3573-4DBD-B0FD-492A36C96C2D",
                    maxResults: 1,
                    searchResultPosition: 0,
                    EmployeeNoList: [{
                        employeeNo: codigo
                    }]
                }
            };
            const userByID = await peticionPostPanel(urlUsers, dataUser, this.usuario, this.contrasena) as UserInfoSearchResponse;
            const fechaCreacion = dayjs(fecha_entrada).format("YYYY-MM-DDTHH:mm:ss");
            const fechaSalida = fecha_salida ? dayjs(fecha_salida).format("YYYY-MM-DDTHH:mm:ss") : "2037-12-31T23:59:59";
            if (userByID.UserInfoSearch.totalMatches === 0) {
                const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;
                const urlCard = `http://${this.ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
                const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
                const dataUser = {
                    UserInfo: {
                        employeeNo: codigo,
                        name: nombre,
                        userType: activo ? "visitor" : "blackList",
                        localUIRight: false,
                        Valid: {
                            enable: true,
                            beginTime: fechaCreacion,
                            endTime: fechaSalida,
                            timeType: "local"
                        },
                        doorRight: "1",
                        RightPlan: [{
                            doorNo: 1,
                            planTemplateNo: "1"
                        }],
                        userVerifyMode: ""
                    }
                };
                const dataCard = {
                    CardInfo: {
                        employeeNo: codigo,
                        cardNo: codigo,
                        cardType: this.#getCardType()
                    }
                };
                const dataImg = {
                    FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": codigo }),
                    img: {
                        value: readStreamIMG,
                        options: {
                            filename: `temp/img_${codigo}.jpg`,
                            contentType: null
                        }
                    }
                }
                let res = await peticionPostPanel(urlUser, dataUser, this.usuario, this.contrasena) as UserInfoSavedResponse;
                if (res.statusString === 'OK') {
                    this.register_created = true;
                    this.register_sync = this.register_sync + 1;
                }
                res = await peticionPostPanel(urlCard, dataCard, this.usuario, this.contrasena) as UserInfoSavedResponse;
                if (res.statusString === 'OK') {
                    this.card_created = true;
                    this.card_sync = this.card_sync + 1;
                }
                /*
                if (activo && img_usuario) {
                    //const res = await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) as UserInfoSavedResponse;
                    const res = await peticionPutImg(urlUserImg, dataImg, this.usuario, this.contrasena) as UserInfoSavedResponse;
                    if (res) if (res.statusString === 'OK') {
                        this.img_created = true;
                        this.img_sync = this.img_sync + 1;
                    }
                }
                */
            } else {
                const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
                const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`
                const dataUser = {
                    UserInfo: {
                        employeeNo: codigo,
                        name: nombre,
                        userType: activo ? "visitor" : "blackList",
                        localUIRight: false,
                        Valid: {
                            enable: true,
                            beginTime: fechaCreacion,
                            endTime: fechaSalida,
                            timeType: "local"
                        },
                        doorRight: "1",
                        RightPlan: [{
                            doorNo: 1,
                            planTemplateNo: "1"
                        }],
                        userVerifyMode: ""
                    }
                };
                const dataImg = {
                    FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": codigo }),
                    img: {
                        value: readStreamIMG,
                        options: {
                            filename: 'temp/img.jpg',
                            contentType: null
                        }
                    }
                }
                const res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena) as UserInfoSavedResponse;
                if (res.statusString === 'OK') {
                    this.register_modified
                    this.register_sync = this.register_sync + 1;
                }
                /*
                if (activo && img_usuario) {
                    //const res = await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) as UserInfoSavedResponse;
                    const res = await peticionPutImg(urlUserImg, dataImg, this.usuario, this.contrasena) as UserInfoSavedResponse;
                    if (res) if (res.statusString === 'OK') {
                        this.img_modified
                        this.img_sync = this.img_sync + 1;
                    }
                }
                */
            }
            return {
                register_created: this.register_created,
                register_modified: this.register_modified,
                card_created: this.card_created,
                img_created: this.img_created,
                img_modified: this.img_modified
            };
        } catch (error) {
            throw error;
        }
    }

    async deleteRegister(registro: IRegistroHV) {
        const { codigo } = registro;
        try {
            const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Delete?format=json`; // Elimina por completo la cita y su info
            const dataUser = {
                UserInfoDelCond: {
                    "EmployeeNoList": [{ "employeeNo": codigo }]
                }
            }
            const res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena) as UserInfoSavedResponse;
            if (res.statusString === 'OK') {
                this.img_deleted = true;
                this.register_sync = this.register_sync + 1;
            }
            return { img_deleted: this.img_deleted };
        } catch (error) {
            throw error;
        }
    }

    async getAllUsers() {
        try {
            let searchPositionUsers = 0;
            let usuariosPanel: any[] = [];
            let bandera = "";
            const urlUsers = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
            let dataUsers = {
                UserInfoSearchCond: {
                    searchID: "2B87C87F-3573-4DBD-B0FD-492A36C96C2D",
                    maxResults: 24,
                    searchResultPosition: searchPositionUsers
                }
            };
            let response = await peticionPostPanel(urlUsers, dataUsers, this.usuario, this.contrasena) as UserInfoSearchResponse;
            bandera = response.UserInfoSearch.responseStatusStrg;
            if (bandera === "NO MATCH") return usuariosPanel;
            usuariosPanel.concat(response.UserInfoSearch.UserInfo);
            if (bandera === "OK") return usuariosPanel;
            do {
                searchPositionUsers = searchPositionUsers + 24;
                dataUsers = {
                    UserInfoSearchCond: {
                        searchID: "2B87C87F-3573-4DBD-B0FD-492A36C96C2D",
                        maxResults: 24,
                        searchResultPosition: searchPositionUsers
                    }
                };
                response = await peticionPostPanel(urlUsers, dataUsers, this.usuario, this.contrasena) as UserInfoSearchResponse;
                bandera = response.UserInfoSearch.responseStatusStrg;
                usuariosPanel.concat(response.UserInfoSearch.UserInfo);
                if (response.UserInfoSearch.numOfMatches < 24) bandera = "OK"
            } while (bandera === "MORE");
            return usuariosPanel;
        } catch (error) {
            throw error;
        }
    }

    async getAllEvents(
        {
            inicio,
            final,
            tipo_evento
        }: {
            inicio: string | Date | number | Dayjs;
            final: string | Date | number | Dayjs;
            tipo_evento: 1 | 38 | 75; // 1: Tarjeta, 75: Rostro, 38: Huella
        }) {
        try {
            let searchPosition = 0;
            let bandera = "";
            let eventosPanel: any[] = [];
            const urlEventos = `http://${this.ip}/ISAPI/AccessControl/AcsEvent?format=json`;
            const start = dayjs(inicio);
            const end = dayjs(final);
            if (!start.isValid() || !end.isValid()) {
                throw new Error("Rango de fechas inválido para consultar eventos del panel.");
            }
            const safeEnd = end.isBefore(start) ? start.add(1, "minute") : end;
            const startTime = start.format("YYYY-MM-DDTHH:mm:ssZ");
            const endTime = safeEnd.format("YYYY-MM-DDTHH:mm:ssZ");
            const major = 5;
            const minor = tipo_evento;
            let dataEventos = {
                AcsEventCond: {
                    searchID: "50bbaf2a-fb5d-40f2-8e26-d193b7835963",
                    searchResultPosition: searchPosition,
                    maxResults: 24,
                    startTime: startTime,
                    endTime: endTime,
                    major: major,
                    minor: minor
                }
            }
            let response = await peticionPostPanel(urlEventos, dataEventos, this.usuario, this.contrasena) as EventInfoSearchResponse;
            bandera = response.AcsEvent.responseStatusStrg;
            if (bandera === "NO MATCH") return eventosPanel;
            eventosPanel = eventosPanel.concat(response.AcsEvent.InfoList);
            if (bandera === "OK") return eventosPanel;
            do {
                searchPosition = searchPosition + 24;
                dataEventos = {
                    AcsEventCond: {
                        searchID: "50bbaf2a-fb5d-40f2-8e26-d193b7835963",
                        searchResultPosition: searchPosition,
                        maxResults: 24,
                        startTime: startTime,
                        endTime: endTime,
                        major: major,
                        minor: minor
                    }
                }
                response = await peticionPostPanel(urlEventos, dataEventos, this.usuario, this.contrasena) as EventInfoSearchResponse;
                bandera = response.AcsEvent.responseStatusStrg;
                eventosPanel = eventosPanel.concat(response.AcsEvent.InfoList);
                if (response.AcsEvent.numOfMatches < 24) bandera = "OK"
            } while (bandera === "MORE")
            return eventosPanel;
        } catch (error) {
            throw error;
        }
    }

    async getEventImage(uri: string) {
        try {
            const base64 = await peticionGetImg(uri, this.usuario, this.contrasena);
            return base64;
        } catch (error) {

        }
    }
    
//////////////////////////////////////////////////////////////////////////////////////////

private static SESSIONS_FILE = path.resolve(process.cwd(), "hv-sessions.json");

/*
private static SESSIONS_FILE =  
process.env.HIKVISION_SESSIONS_FILE ??
path.resolve(process.cwd(), "../tools/hikvision-auth/hv-sessions.json");
*/

private static readSessionsMap(): Record<string, any> {
    const p = Hikvision.SESSIONS_FILE;
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, "utf8");
    try { return JSON.parse(raw); } catch { return {}; }
    }

    private static writeSessionsMap(map: Record<string, any>) {
    const p = Hikvision.SESSIONS_FILE;
    fs.writeFileSync(p, JSON.stringify(map, null, 2), "utf8");
    }

    private readSessionForIp() {
    const map = Hikvision.readSessionsMap();
    return map[this.ip] ?? null;
    }

    private saveSessionForIp(session: { webSession: string; tokenValue?: string; sessionTag?: string; deviceUrl?: string }) {
    const map = Hikvision.readSessionsMap();
    map[this.ip] = {
        deviceUrl: session.deviceUrl ?? `https://${this.ip}/doc/index.html#/portal/login`,
        webSession: session.webSession,
        tokenValue: session.tokenValue ?? "",
        sessionTag: session.sessionTag ?? "",
        updatedAt: new Date().toISOString(),
    };
    Hikvision.writeSessionsMap(map);
    }


private static resolveAuthDir(): string {
    const candidates = [
        process.env.HIKVISION_AUTH_DIR,
        path.resolve(process.cwd(), "../tools/hikvision-auth"),
        path.resolve(process.cwd(), "../tools/tools/hikvision-auth"),
        path.resolve(process.cwd(), "tools/hikvision-auth"),
        path.resolve(process.cwd(), "tools/tools/hikvision-auth"),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return path.resolve(process.cwd(), "../tools/hikvision-auth");
}

private static AUTH_DIR = Hikvision.resolveAuthDir();

    private static SESSIONS_DIR =
    process.env.HIKVISION_SESSIONS_DIR ??
    path.resolve(Hikvision.AUTH_DIR, "sessions");

    private static fileKey(ip: string) {
    return ip.replace(/[^\dA-Za-z]/g, "_");
    }

    private sessionFilePath() {
    if (!fs.existsSync(Hikvision.SESSIONS_DIR)) {
        fs.mkdirSync(Hikvision.SESSIONS_DIR, { recursive: true });
    }
    return path.join(Hikvision.SESSIONS_DIR, `hv-session-${Hikvision.fileKey(this.ip)}.json`);
    }

    private readSessionFileIfExists(): null | { ip?: string; webSession: string; tokenValue?: string; sessionTag?: string } {
    const p = this.sessionFilePath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
    }

    /*
    private async isDeviceReachable(): Promise<boolean> {
    // “Reachable” sin auth: si responde (aunque sea 401) ya existe.
    // Ajusta a http/https según tu entorno.
    const url = `http://${this.ip}/`;
    try {
        const res = await fetch(url, { method: "GET" });
        return true;
    } catch {
        return false;
    }
    }

    private runAuthAndStoreSession(): void {
    // Construye URL por IP (ajusta si usas siempre /doc/index.html#/portal/login)
    const deviceUrl =
        process.env.DEVICE_URL_TEMPLATE
        ? process.env.DEVICE_URL_TEMPLATE.replace("{ip}", this.ip)
        : `https://${this.ip}/doc/index.html#/portal/login`;

    const result = spawnSync("npm", ["run", "run"], {
        cwd: Hikvision.AUTH_DIR,
        stdio: "inherit",
        shell: true,
        env: {
        ...process.env,
        DEVICE_URL: deviceUrl,
        DEVICE_IP: this.ip, // opcional pero util si quieres armar URL desde IP
        SESSION_OUT: this.sessionFilePath(), // <-- clave: archivo por IP
        HV_USER: this.usuario,
        HV_PASS: this.contrasena,
        HEADLESS: "true",
        },

    });

    if (result.status !== 0) {
        throw new Error("hikvision-auth falló");
    }

    // auth genera hv-session.json (default). Lo movemos a sessions/hv-session-<ip>.json
    const produced = path.resolve(Hikvision.AUTH_DIR, "hv-session.json");
    if (!fs.existsSync(produced)) {
        throw new Error("hikvision-auth no generó hv-session.json");
    }

    const dest = this.sessionFilePath();
    fs.copyFileSync(produced, dest);
    }

*/
//////////////////////////////////////////////////////////////////////////////////////////

/*
    // Ajusta rutas aqui
    private static SESSION_PATH =
    process.env.HIKVISION_SESSION_PATH ??

    /////////////////////
    path.resolve(process.cwd(), "../tools/hikvision-auth/hv-session.json"); 
    // Si el backend se ejecuta desde "panel_server", ../tools es correcto.
    // Si se ejecuta desde la raiz, cambia a: 
    // path.resolve(process.cwd(), "tools/hikvision-auth/hv-session.json")

    private static AUTH_DIR =
    process.env.HIKVISION_AUTH_DIR ??
    path.resolve(process.cwd(), "../tools/hikvision-auth");
    // Igual: si ejecutas desde raíz, seria "tools/hikvision-auth"

    private static readSessionFile(): { webSession: string; tokenValue: string; sessionTag?: string } {
    const raw = fs.readFileSync(Hikvision.SESSION_PATH, "utf8");
    const json = JSON.parse(raw);

    if (!json.webSession) throw new Error("hv-session.json inválido: falta webSession");
    return {
        webSession: json.webSession,
        tokenValue: json.tokenValue ?? "",
        sessionTag: json.sessionTag ?? ""
    };
    }

    private static runHikvisionAuth(): void {
    const r = spawnSync("npm", ["run", "run"], {
        cwd: Hikvision.AUTH_DIR,
        stdio: "inherit",
        shell: true
    });
    if (r.status !== 0) {
        throw new Error("No se pudo ejecutar hikvision-auth (npm run run)");
    }
    }
*/

//////////////////////////////////////////////////////////////////////////////////////////
/*
    async #getLoginCookie() {
    // 1) Si hay sesion guardada por IP, usala
    const s = this.readSessionFileIfExists();

    if (s?.webSession) {
        // si el archivo trae ip y NO coincide, lo ignoramos
        if (s.ip && s.ip !== this.ip) {
        // ignorar: es de otra IP
        } else {
        this.web_session = s.webSession;
        this.token = s.tokenValue || "";
        return { webSession: s.webSession, tokenValue: s.tokenValue || "" };
        }
    }

    // 2) Si no responde la IP, NO guardes nada (evitas “guardar una que no exista”)
    const reachable = await this.isDeviceReachable();
    if (!reachable) {
        throw new Error(`El dispositivo ${this.ip} no responde. No se genera sesión.`);
    }

    // 3) Generar sesión con auth usando esta IP/credenciales y guardarla por IP
    this.runAuthAndStoreSession();

    // 4) Leer la sesión nueva
    const s2 = this.readSessionFileIfExists();
    if (!s2?.webSession) {
        throw new Error("No se pudo leer sesión generada");
    }

    this.web_session = s2.webSession;
    this.token = s2.tokenValue || "";

    return { webSession: s2.webSession, tokenValue: s2.tokenValue || "" };
    }
*/

    private runAuthForCurrentIp(): void {
    const deviceUrl = `https://${this.ip}/doc/index.html#/portal/login`;

    console.log("[HIKVISION] Ejecutando auth para IP:", this.ip);
    console.log("[HIKVISION] URL:", deviceUrl);

    const result = spawnSync("npm", ["run", "run"], {
        cwd: Hikvision.AUTH_DIR,   // carpeta tools/hikvision-auth
        stdio: "inherit",
        shell: true,
        env: {
        ...process.env,
        DEVICE_URL: deviceUrl,
        HV_USER: this.usuario,
        HV_PASS: this.contrasena,
        HEADLESS: "true",
        },
    });

    if (result.status !== 0) {
        throw new Error("hikvision-auth falló");
    }
    }

    async #getLoginCookie() {
    // 1) Intentar usar sesión guardada para esta IP
    const s = this.readSessionForIp();
    if (s?.webSession) {
        this.web_session = s.webSession;
        this.token = s.tokenValue || "";
        return { webSession: s.webSession, tokenValue: s.tokenValue || "" };
    }

    // 2) Si no hay, generar (solo para esta IP)
    this.runAuthForCurrentIp(); // ejecuta hikvision-auth con DEVICE_URL/HV_USER/HV_PASS

    // 3) Leer la sesión generada para ESTA IP (archivo por IP)
    const produced = path.resolve(Hikvision.AUTH_DIR, "hv-session.json");
    const raw = fs.readFileSync(produced, "utf8");
    const gen = JSON.parse(raw);

    this.saveSessionForIp({
        webSession: gen.webSession,
        tokenValue: gen.tokenValue,
        sessionTag: gen.sessionTag,
        deviceUrl: gen.deviceUrl,
    });

    this.web_session = gen.webSession;
    this.token = gen.tokenValue || "";
    return { webSession: gen.webSession, tokenValue: gen.tokenValue || "" };
    }


//////////////////////////////////////////////////////////////////////////////////////////

    // Install npx puppeteer browsers install
    /*
    async #getLoginCookie() {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--ignore-certificate-errors', ...minimal_args],
            acceptInsecureCerts: true
        });
        try {
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(30000);

            //Detectar modelo
            const panelModelo =
                PANEL_BY_IP[this.ip] ?? "default";

            const selectors = PANEL_SELECTORS[panelModelo];

            if (!selectors) {
                throw new Error(`Modelo de panel no soportado para IP ${this.ip}`);
            }

            // Navegar a URL correcta
            const url = selectors.url(this.ip);
            await page.goto(url, { waitUntil: "networkidle0" });
            await page.waitForSelector(selectors.wait, { timeout: 20000 });

            // Escribir credenciales (parametrizadas)
            await page.type(selectors.username, this.usuario, { delay: 50 });
            await page.type(selectors.password, this.contrasena, { delay: 50 });

            // Login
            await Promise.all([
                page.click(selectors.button),
                page.waitForNavigation({ waitUntil: "networkidle0" })
            ]);

            /*
                        await page.goto('https://192.168.1.128/doc/index.html#/portal/login'); 
            
            
                        await page.waitForSelector('input[placeholder="Nombre de usuario"]');
                        await page.type('input[placeholder="Nombre de usuario"]', 'admin');
            
                        await page.waitForSelector('input[placeholder="Contraseña"]');
                        await page.type('input[placeholder="Contraseña"]', 'Bardahl2025.');
            
                        await page.click('.login-btn');
            
                        // Esperar navegación
                        await page.waitForNavigation();
            */
            // Panel LOCAL (Puede variar dependiendo del modelo y versión del panel)
            /*await page.waitForSelector('button.login-btn');
            await page.type('#username', this.usuario);
            await page.type('#password', this.contrasena);
            await page.click('button.login-btn')*/

            // Panel PROD (Puede variar dependiendo del modelo y versión del panel)
            // await page.waitForSelector("#portal > div > div > div > div.login-container > div.middle > div > form > div:nth-child(4) > div > button");
            // await page.type("#portal > div > div > div > div.login-container > div.middle > div > form > div.login-user.el-form-item.is-required-right > div > div > input", this.usuario);
            // await page.type("#portal > div > div > div > div.login-container > div.middle > div > form > div.login-item.el-form-item.is-required-right > div > span > div > input", this.contrasena);
            // await page.click("#portal > div > div > div > div.login-container > div.middle > div > form > div:nth-child(4) > div > button");

/*
            // Obtener sessionTag
            const sessionTag = await page.evaluate(() =>
                window.sessionStorage.getItem('sessionTag')
            );

            // Obtener cookies
            const cookies = await page.cookies();
            const loginCookie = cookies.find(c => /^WebSession_/.test(c.name));

            if (!loginCookie) {
                throw new Error("No se pudo obtener la cookie de sesion");
            }


            const webSession = `${loginCookie.name}=${loginCookie.value}`;
            // Obtener token ISAPI
            const urlSecurity = `http://${this.ip}/ISAPI/Security/token?format=json`;

            interface TokenResponse {
                Token?: {
                    value?: string;
                };
            }

            const tokenResponse = await peticionGetPanelNoAuth(
                urlSecurity,
                {
                    Cookie: webSession,
                    Sessiontag: sessionTag ?? ""
                }
            ) as TokenResponse;

            const tokenValue = tokenResponse.Token?.value;

            return {
                webSession,
                tokenValue
            };

        } finally {
            await browser.close();
        }
    }
    ///////////////////////////////////////////////////////////////////////////////////////////
    
    async #navigateWithRetry(page: Page, url: string, retries: number = 3): Promise<HTTPResponse | null> {
        for (let i = 0; i < retries; i++) {
            try {
                return await page.goto(url, { waitUntil: 'networkidle0' });
            } catch (error) {
                if (i === retries - 1) throw error;
            }
        }
        return null;
    }
    */
    
    /**
    * Convertir imagen en base64 a fs.createReadStream data
    * @param base64Data - Datos en formato de base64
    * @param tempFilePath - Path temporal para almacenar la imagen
    */
    async #base64ToReadStream(base64Data: string, tempFilePath: string): Promise<fs.ReadStream> {
        try {
            const base64Image = base64Data.split(';base64,').pop() || "";
            const buffer = Buffer.from(base64Image, 'base64');

            await sharp(buffer)
                .toFormat('jpeg')
                .toFile(tempFilePath);

            const stream = fs.createReadStream(tempFilePath);
            stream.on("close", () => {
                fs.promises.unlink(tempFilePath).catch(() => null);
            });
            stream.on("error", () => {
                fs.promises.unlink(tempFilePath).catch(() => null);
            });
            return stream;
        } catch (error) {
            throw error;
        }
    }
}
