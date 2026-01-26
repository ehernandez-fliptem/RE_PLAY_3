import axios from "axios";
import https from "https";
import { CONFIG } from "./config";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

export const clienteAxios = axios.create({
    baseURL: CONFIG.URL_SERVER,
});

clienteAxios.defaults.headers.common['x-access-token-hyundai'] = CONFIG.SECRET_HYUNDAI;
clienteAxios.defaults.httpsAgent = httpsAgent;
