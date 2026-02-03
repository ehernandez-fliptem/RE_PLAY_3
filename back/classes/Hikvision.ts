import axios from "axios";
import fs from "fs";
import puppeteer, { HTTPResponse, Page } from 'puppeteer';
import { CONFIG } from "../config";

const minimal_args = [
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-gl=swiftshader',
];

interface IRegistroHV {
    img_usuario?: string;
    id_general?: string | number;
    codigo?: string;
    nombre?: string;
    activo?: boolean;
    fecha_creacion?: Date | number | string;
    fecha_entrada?: Date | number | string;
    fecha_salida?: Date | number | string;
}

export default class Hikvision {
    ip: string;
    usuario: string;
    contrasena: string;
    token_hyundai?: string | null
    token: string | null
    web_session: string | null
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
    constructor(ip: string, usuario: string, contrasena: string) {
        this.ip = ip;
        this.usuario = usuario;
        this.contrasena = contrasena;
        this.token_hyundai = CONFIG.SECRET_HYUNDAI;
        this.token = null;
        this.web_session = null;
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

    async getTokenValue() {
        try {
            if (!this.token || this.web_session) {
                const respuesta = await axios.post(`${process.env.URL_HYUNDAI}/api/panel/seguridad`, { panel: { direccion_ip: this.ip, usuario: this.usuario, contrasena: this.contrasena } }, { headers: { "x-access-token": this.token_hyundai, "ngrok-skip-browser-warning": "69420", }, });
                if (!respuesta.data.estado) {
                    throw new Error(respuesta.data.mensaje);
                }
                const { token, web_session } = respuesta.data.datos;
                this.token = token;
                this.web_session = web_session;
            }
        } catch (error) {
            throw error;
        }
    }

    async testConnection() {
        try {
            const respuesta = await axios.post(`${process.env.URL_HYUNDAI}/api/panel/`, { panel: { direccion_ip: this.ip, usuario: this.usuario, contrasena: this.contrasena } }, { headers: { "x-access-token": this.token_hyundai, "ngrok-skip-browser-warning": "69420", }, });
            return respuesta.data;
        } catch (error) {
            throw error;
        }
    }

    async saverUser(registro: IRegistroHV) {
        try {
            console.log("Panel sincronizar")
            const respuesta = await axios.put(`${process.env.URL_HYUNDAI}/api/panel/usuarios`, { datos: registro, panel: { direccion_ip: this.ip, usuario: this.usuario, contrasena: this.contrasena, token: this.token, web_session: this.web_session } }, { headers: { 'x-access-token': this.token_hyundai, "ngrok-skip-browser-warning": "69420" } });
            if (respuesta.data.estado) {
                const { user_created, user_modified, card_created, img_created, img_modified } = respuesta.data.datos;
                if (user_created || user_modified) {
                    this.user_created = true;
                    this.user_sync = this.user_sync + 1;
                }
                if (card_created) {
                    this.card_created = true;
                    this.card_sync = this.card_sync + 1;
                }
                if (img_created || img_modified) {
                    this.img_created = true;
                    this.img_sync = this.img_sync + 1;
                }
            }

            // const { img_usuario, id_general, nombre, activo, fecha_creacion } = registro;
            // const readStreamIMG = (activo && img_usuario) ? await this.#base64ToReadStream(img_usuario, `temp/img_${id_general}.jpg`) : '';
            // const urlUsers = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
            // const dataUser = {
            //     UserInfoSearchCond: {
            //         searchID: "2B87C87F-3573-4DBD-B0FD-492A36C96C2D",
            //         maxResults: 1,
            //         searchResultPosition: 0,
            //         EmployeeNoList: [{
            //             employeeNo: String(id_general)
            //         }]
            //     }
            // };
            // const userByID = await peticionPostPanel(urlUsers, dataUser, this.usuario, this.contrasena);
            // const fechaCreacion = String(await fomatoISO(fecha_creacion)).replace(' ', 'T');

            // if (userByID.UserInfoSearch.totalMatches === 0) {
            //     const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;
            //     const urlCard = `http://${this.ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
            //     const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
            //     const dataUser = {
            //         UserInfo: {
            //             employeeNo: String(id_general),
            //             name: nombre,
            //             userType: activo ? "normal" : "blackList",
            //             localUIRight: false,
            //             Valid: {
            //                 enable: true,
            //                 beginTime: fechaCreacion,
            //                 endTime: "2037-12-31T23:59:59",
            //                 timeType: "local"
            //             },
            //             doorRight: "1",
            //             RightPlan: [{
            //                 doorNo: 1,
            //                 planTemplateNo: "1"
            //             }],
            //             userVerifyMode: ""
            //         }
            //     };
            //     const dataCard = {
            //         CardInfo: {
            //             employeeNo: String(id_general),
            //             cardNo: String(id_general),
            //             cardType: "normalCard"
            //         }
            //     };
            //     const dataImg = {
            //         FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": String(id_general) }),
            //         img: {
            //             value: readStreamIMG,
            //             options: {
            //                 filename: `temp/img_${id_general}.jpg`,
            //                 contentType: null
            //             }
            //         }
            //     }
            //     let res = await peticionPostPanel(urlUser, dataUser, this.usuario, this.contrasena);
            //     if (res.statusString === 'OK') {
            //         this.user_created = true;
            //         this.user_sync = this.user_sync + 1;
            //     }
            //     res = await peticionPostPanel(urlCard, dataCard, this.usuario, this.contrasena);
            //     if (res.statusString === 'OK') {
            //         this.card_created = true;
            //         this.card_sync = this.card_sync + 1;
            //     }
            //     res = (activo && img_usuario) ? await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) : null;
            //     if (res) if (res.statusString === 'OK') {
            //         this.img_created = true;
            //         this.img_sync = this.img_sync + 1;
            //     }
            // } else {
            //     const { employeeNo, name, userType, numOfFace } = userByID.UserInfoSearch.UserInfo[0];
            //     if (!(employeeNo === String(id_general) && ((userType === 'normal' && activo) || (userType === 'blackList' && !activo)) && name === nombre)) {
            //         const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
            //         const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`
            //         const dataUser = {
            //             UserInfo: {
            //                 employeeNo: String(id_general),
            //                 name: nombre,
            //                 userType: activo ? "normal" : "blackList",
            //                 localUIRight: false,
            //                 Valid: {
            //                     enable: true,
            //                     beginTime: fechaCreacion,
            //                     endTime: "2037-12-31T23:59:59",
            //                     timeType: "local"
            //                 },
            //                 doorRight: "1",
            //                 RightPlan: [{
            //                     doorNo: 1,
            //                     planTemplateNo: "1"
            //                 }],
            //                 userVerifyMode: ""
            //             }
            //         };
            //         const dataImg = {
            //             FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": String(id_general) }),
            //             img: {
            //                 value: readStreamIMG,
            //                 options: {
            //                     filename: `temp/img_${id_general}.jpg`,
            //                     contentType: null
            //                 }
            //             }
            //         }
            //         let res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena);
            //         if (res.statusString === 'OK') {
            //             this.user_modified = true;
            //             this.user_sync = this.user_sync + 1;
            //         }
            //         res = (activo && img_usuario) ? await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) : null;
            //         if (res) if (res.statusString === 'OK') {
            //             this.img_modified = true;
            //             this.img_sync = this.img_sync + 1;
            //         }
            //     } else {
            //         const urlExisteImagen = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSearch?format=json`;
            //         const data = { "searchResultPosition": 0, "maxResults": 30, "faceLibType": "blackFD", "FDID": "1", "FPID": String(id_general) }
            //         let res = await peticionPostPanel(urlExisteImagen, data, this.usuario, this.contrasena, this.ip);
            //         if (!!img_usuario) {
            //             const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
            //             const dataImg = {
            //                 FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": String(id_general) }),
            //                 img: {
            //                     value: readStreamIMG,
            //                     options: {
            //                         filename: `temp/img_${id_general}.jpg`,
            //                         contentType: null
            //                     }
            //                 }
            //             }
            //             res = (activo && img_usuario) ? await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) : null;
            //             if (res) if (res.statusString === 'OK') {
            //                 this.img_modified = true;
            //                 this.img_sync = this.img_sync + 1;
            //             }
            //         }
            //     }
            //     if (numOfFace === 1 && !img_usuario && activo) {
            //         const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
            //         const dataImg = { "faceLibType": "blackFD", "FDID": "1", "FPID": String(id_general), "deleteFP": true };
            //         let res = await peticionPutPanel(urlUserImg, dataImg, this.usuario, this.contrasena, this.ip);
            //         if (res) if (res.statusString === 'OK') {
            //             this.img_modified = true;
            //             this.img_sync = this.img_sync + 1;
            //         }
            //     }
            // }
            return {
                user_created: this.user_created,
                user_modified: this.user_modified,
                card_created: this.card_created,
                img_created: this.img_created,
                img_modified: this.img_modified
            };
        }
        catch (error) {
            console.log(error)
            throw error;
        }
    }

    async deleteUser(registro: IRegistroHV) {
        try {
            const respuesta = await axios.put(`${process.env.URL_HYUNDAI}/api/panel/usuarios/desactivar`, { usuarios: [registro], panel: { direccion_ip: this.ip, usuario: this.usuario, contrasena: this.contrasena } }, { headers: { 'x-access-token': this.token_hyundai, "ngrok-skip-browser-warning": "69420" } });
            if (respuesta.data.estado) {
                this.user_deleted = respuesta.data.datos.user_deleted
            }
            // const { id_general } = registro;
            // const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
            // const dataUser = {
            //     UserInfo: {
            //         employeeNo: String(id_general),
            //         userType: "blackList"
            //     }
            // };
            // const res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena);
            // if (res.statusString === 'OK') {
            //     this.img_deleted = true;
            //     this.user_sync = this.user_sync + 1;
            // }
            return { user_deleted: this.user_deleted };
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    async saveRegister(registro: IRegistroHV) {
        try {
            const respuesta = await axios.put(`${process.env.URL_HYUNDAI}/api/panel/citas`, { datos: registro, panel: { direccion_ip: this.ip, usuario: this.usuario, contrasena: this.contrasena, token: this.token, web_session: this.web_session } }, { headers: { 'x-access-token': this.token_hyundai, "ngrok-skip-browser-warning": "69420" } });
            if (respuesta.data.estado) {
                const { register_created, register_modified, card_created, img_created, img_modified } = respuesta.data.datos;
                if (register_created || register_modified) {
                    this.user_created = true;
                    this.user_sync = this.user_sync + 1;
                }
                if (card_created) {
                    this.card_created = true;
                    this.card_sync = this.card_sync + 1;
                }
                if (img_created || img_modified) {
                    this.img_created = true;
                    this.img_sync = this.img_sync + 1;
                }
            }
            // const { img_usuario, codigo, nombre, activo, fecha_entrada, fecha_salida } = registro;
            // const readStreamIMG = (activo && img_usuario) ? await this.#base64ToReadStream(img_usuario, `temp/img_${codigo}.jpg`) : '';
            // const urlUsers = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Search?format=json`;
            // const dataUser = {
            //     UserInfoSearchCond: {
            //         searchID: "2B87C87F-3573-4DBD-B0FD-492A36C96C2D",
            //         maxResults: 1,
            //         searchResultPosition: 0,
            //         EmployeeNoList: [{
            //             employeeNo: codigo
            //         }]
            //     }
            // };
            // const userByID = await peticionPostPanel(urlUsers, dataUser, this.usuario, this.contrasena);
            // const fechaCreacion = String(await fomatoISO(fecha_entrada)).replace(' ', 'T');
            // const fechaSalida = fecha_salida ? String(await fomatoISO(fecha_salida)).replace(' ', 'T') : "2037-12-31T23:59:59";
            // if (userByID.UserInfoSearch.totalMatches === 0) {
            //     const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;
            //     const urlCard = `http://${this.ip}/ISAPI/AccessControl/CardInfo/Record?format=json`;
            //     const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;
            //     const dataUser = {
            //         UserInfo: {
            //             employeeNo: codigo,
            //             name: nombre,
            //             userType: activo ? "visitor" : "blackList",
            //             localUIRight: false,
            //             Valid: {
            //                 enable: true,
            //                 beginTime: fechaCreacion,
            //                 endTime: fechaSalida,
            //                 timeType: "local"
            //             },
            //             doorRight: "1",
            //             RightPlan: [{
            //                 doorNo: 1,
            //                 planTemplateNo: "1"
            //             }],
            //             userVerifyMode: ""
            //         }
            //     };
            //     const dataCard = {
            //         CardInfo: {
            //             employeeNo: codigo,
            //             cardNo: codigo,
            //             cardType: "normalCard"
            //         }
            //     };
            //     const dataImg = {
            //         FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": codigo }),
            //         img: {
            //             value: readStreamIMG,
            //             options: {
            //                 filename: `temp/img_${codigo}.jpg`,
            //                 contentType: null
            //             }
            //         }
            //     }
            //     let res = await peticionPostPanel(urlUser, dataUser, this.usuario, this.contrasena);
            //     if (res.statusString === 'OK') {
            //         this.register_created = true;
            //         this.register_sync = this.register_sync + 1;
            //     }
            //     res = await peticionPostPanel(urlCard, dataCard, this.usuario, this.contrasena);
            //     if (res.statusString === 'OK') {
            //         this.card_created = true;
            //         this.card_sync = this.card_sync + 1;
            //     }
            //     res = (activo && img_usuario) ? await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) : null;
            //     if (res) if (res.statusString === 'OK') {
            //         this.img_created = true;
            //         this.img_sync = this.img_sync + 1;
            //     }
            // } else {
            //     const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
            //     const urlUserImg = `http://${this.ip}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`
            //     const dataUser = {
            //         UserInfo: {
            //             employeeNo: codigo,
            //             name: nombre,
            //             userType: activo ? "visitor" : "blackList",
            //             localUIRight: false,
            //             Valid: {
            //                 enable: true,
            //                 beginTime: fechaCreacion,
            //                 endTime: fechaSalida,
            //                 timeType: "local"
            //             },
            //             doorRight: "1",
            //             RightPlan: [{
            //                 doorNo: 1,
            //                 planTemplateNo: "1"
            //             }],
            //             userVerifyMode: ""
            //         }
            //     };
            //     const dataImg = {
            //         FaceDataRecord: JSON.stringify({ "faceLibType": "blackFD", "FDID": "1", "FPID": codigo }),
            //         img: {
            //             value: readStreamIMG,
            //             options: {
            //                 filename: 'temp/img.jpg',
            //                 contentType: null
            //             }
            //         }
            //     }
            //     let res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena);
            //     if (res.statusString === 'OK') {
            //         this.register_modified
            //         this.register_sync = this.register_sync + 1;
            //     }
            //     res = (activo && img_usuario) ? await peticionPutImg(urlUserImg, dataImg, this.web_session, this.token) : null;
            //     if (res) if (res.statusString === 'OK') {
            //         this.img_modified
            //         this.img_sync = this.img_sync + 1;
            //     }
            // }
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
        try {
            const respuesta = await axios.put(`${process.env.URL_HYUNDAI}/api/panel/citas/eliminar`, { citas: [registro], panel: { direccion_ip: this.ip, usuario: this.usuario, contrasena: this.contrasena } }, { headers: { 'x-access-token': this.token_hyundai, "ngrok-skip-browser-warning": "69420" } });
            if (respuesta.data.estado) {
                this.img_deleted = respuesta.data.datos.img_deleted
            }
            // const { codigo } = registro;
            // const urlUser = `http://${this.ip}/ISAPI/AccessControl/UserInfo/Delete?format=json`;
            // const dataUser = {
            //     UserInfoDelCond: {
            //         "EmployeeNoList":
            //             [{ "employeeNo": codigo }]
            //     }
            // }
            // const res = await peticionPutPanel(urlUser, dataUser, this.usuario, this.contrasena);
            // if (res.statusString === 'OK') {
            //     this.img_deleted = true;
            //     this.register_sync = this.register_sync + 1;
            // }
            return { img_deleted: this.img_deleted };
        } catch (error) {
            throw error;
        }
    }

    async #getLoginCookie() {
        try {
            const browser = await puppeteer.launch({ headless: true, args: minimal_args });
            try {
                const URL = `http://${this.ip}/#/login`;
                const page = await browser.newPage();
                page.setDefaultNavigationTimeout(30000);

                await this.#navigateWithRetry(page, URL, 3);
                await page.setViewport({ width: 1600, height: 900 });

                // Panel LOCAL (Puede variar dependiendo del modelo y versión del panel)
                // await page.waitForSelector('button.login-btn');
                // await page.type('#username', this.usuario);
                // await page.type('#password', this.contrasena);
                // await page.click('button.login-btn')

                // Panel PROD (Puede variar dependiendo del modelo y versión del panel)
                await page.waitForSelector("#portal > div > div > div > div.login-container > div.middle > div > form > div:nth-child(4) > div > button");
                await page.type("#portal > div > div > div > div.login-container > div.middle > div > form > div.login-user.el-form-item.is-required-right > div > div > input", this.usuario);
                await page.type("#portal > div > div > div > div.login-container > div.middle > div > form > div.login-item.el-form-item.is-required-right > div > span > div > input", this.contrasena);
                await page.click("#portal > div > div > div > div.login-container > div.middle > div > form > div:nth-child(4) > div > button");

                await page.waitForNavigation();
                const cookies = await page.cookies();
                const regex = /^WebSession_/
                const login_cookie = cookies.find((item) => regex.test(item.name)) as { name: any, value: any };
                if (!login_cookie) throw new Error('No se pudo obtener la cookie para conectarse al panel.')
                return { webSession: `${login_cookie.name}=${login_cookie.value}` }
            } catch (error) {
                throw error;
            } finally {
                await Promise.all((await browser.pages()).map((page) => page.close()));
                await browser.close();
            }
        } catch (error) {
            throw error;
        }
    }

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

    /**
    * Convertir imagen en base64 a fs.createReadStream data
    * @param base64Data - Datos en formato de base64
    * @param tempFilePath - Path temporal para almacenar la imagen
    */
    async #base64ToReadStream(base64Data: string, tempFilePath: string): Promise<fs.ReadStream> {
        try {
            const base64Image = base64Data?.split(';base64,').pop() || "";
            fs.writeFileSync(tempFilePath, base64Image, { encoding: 'base64' });
            const readStream = fs.createReadStream(tempFilePath);
            readStream.on("close", () => {
                fs.promises.unlink(tempFilePath).catch(() => null);
            });
            readStream.on("error", () => {
                fs.promises.unlink(tempFilePath).catch(() => null);
            });
            return readStream;
        } catch (error) {
            throw error;
        }
    }
}
