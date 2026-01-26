import './cron/jobs';
import { Server as SocketServer } from 'socket.io';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import http from 'http';
import https from 'https';
import fileupload from 'express-fileupload';
import device from 'express-device';
import * as faceapi from 'face-api.js';

import registrosHandlers from './handlers/registros.handlers';
import eventosHandlers from './handlers/eventos.handlers';
import PROD_ROUTES from './middlewares/prodRoutes';
import { limiter404 } from './middlewares/limiters';
import { validarTokenWS } from './middlewares/validarTokenWS';
import { logRequest } from "./middlewares/logRequest";

// DAYSJS CONFIG
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import 'dayjs/locale/es'

import { CertificateManager } from './classes/CertificateManager';
import { CertificateManagerOptions } from './types/certificate';

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.locale("es");

// ENDPOINTS
import accesosRoutes from './routes/accesos.routes';
import authRoutes from './routes/auth.routes';
import asignacionesRoutes from './routes/asignaciones.routes';
// import chatbotRoutes from './routes/chatbot.routes';
import camarasRoutes from './routes/camaras.routes';
import configuracionRoutes from './routes/configuracion.routes';
import cubiculosRoutes from './routes/cubiculos.routes';
import dashboardRoutes from './routes/dashboard.routes';
import departamentosRoutes from './routes/departamentos.routes';
import documentosRoutes from './routes/documentos.routes';
import empresasRoutes from './routes/empresas.routes';
import errorRoutes from './routes/error.routes';
import eventosRoutes from './routes/eventos.routes';
import dispositivosHvRoutes from './routes/dispositivoshv.routes';
import horariosRoutes from './routes/horarios.routes';
import ocrRoutes from './routes/ocr.routes';
import pasesRoutes from './routes/pases.routes';
import perfilRoutes from './routes/perfil.routes';
import pisosRoutes from './routes/pisos.routes';
import puestosRoutes from './routes/puestos.routes';
import recuperacionesRoutes from './routes/recuperaciones.routes';
import registrosRoutes from './routes/registros.routes';
import usuariosRoutes from './routes/usuarios.routes';
import validacionRoutes from './routes/validacion.routes';
import visitantesRoutes from './routes/visitantes.routes';

import { CONFIG } from './config';

const ENV = CONFIG.NODE_ENV as "DEV" | "PROD";
if (!ENV) throw new Error("Entorno por definir");
if (!["DEV", "PROD"].includes(ENV)) throw new Error("El tipo de entorno no esta definido correctamente (dev || prod)");

const ORIGIN: string[] = [];
if (ENV === "DEV") ORIGIN.push('172.18.0.73:5173'); //http://localhost:5173

const options: CertificateManagerOptions = {
    certPaths: {
        key: 'secure/private/privkey.pem',
        cert: 'secure/certs/cert.pem',
        // ca: 'secure/certs/chain.pem'
    }
};

export default async function Server() {
    try {
        const app = express();
        const httpServer = http.createServer(app);

        const onConnection = (socket: any) => {
            registrosHandlers(io, socket);
            eventosHandlers(io, socket);
        };

        app.use(cors({
            origin: ORIGIN
        }));

        // Redicreccionar http
        // if (ENV == "PROD")
        //     app.use((req, res, next) => {
        //         if (!req.secure) {
        //             res.redirect(`https://${req.headers.host}${req.url}`);
        //             return
        //         }
        //         next();
        //     });

        app.use(logRequest);
        app.use(fileupload());
        app.use(device.capture());
        app.use(morgan('common'));
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ limit: '50mb', extended: true }));
        app.use(express.static(path.join(__dirname, 'dist/')));
        // app.use('/models', express.static(path.join(__dirname, 'public/models')));

        if (ENV == "PROD")
            app.get(PROD_ROUTES, (_req, res) => {
                res.sendFile(path.join(__dirname, 'dist/', 'index.html'));
            });

        app.use('/api/accesos', accesosRoutes);
        app.use('/api/auth', authRoutes);
        app.use('/api/asignaciones', asignacionesRoutes);
        // app.use('/api/chatbot', chatbotRoutes);
        app.use('/api/camaras', camarasRoutes);
        app.use('/api/configuracion', configuracionRoutes);
        app.use('/api/cubiculos', cubiculosRoutes);
        app.use('/api/dashboard', dashboardRoutes);
        app.use('/api/departamentos', departamentosRoutes);
        app.use('/api/documentos', documentosRoutes);
        app.use('/api/empresas', empresasRoutes);
        app.use('/api/error', errorRoutes);
        app.use('/api/eventos', eventosRoutes);
        app.use('/api/dispositivos-hikvision', dispositivosHvRoutes);
        app.use('/api/horarios', horariosRoutes);
        app.use('/api/ocr', ocrRoutes);
        app.use('/api/pases', pasesRoutes);
        app.use('/api/perfil', perfilRoutes);
        app.use('/api/pisos', pisosRoutes);
        app.use('/api/puestos', puestosRoutes);
        app.use('/api/recuperaciones', recuperacionesRoutes);
        app.use('/api/registros', registrosRoutes);
        app.use('/api/usuarios', usuariosRoutes);
        app.use('/api/validacion', validacionRoutes);
        app.use('/api/visitantes', visitantesRoutes);

        // Rutas no encontradas
        app.use(limiter404, (_req: Request, res: Response) => {
            res.status(404).json({ mensaje: "Recurso no encontrado." });
        });

        let httpsServer = null;
        let certificateManager = null;
        // Crear y configurar servidor HTTPS
        if (ENV === "PROD") {
            certificateManager = new CertificateManager(app, options);
            httpsServer = certificateManager.getServer();

        }
        if (ENV === "DEV") {
            httpsServer = https.createServer({}, app)
        }

        if (!httpsServer) throw new Error("No se configuró correctamente el servidor HTTPS.")

        // WebSocket Server
        const io = new SocketServer(ENV === "PROD" ? httpServer : httpServer, {
            cors: {
                origin: ORIGIN
            },
            transports: ["websocket"]
        });

        io.use(validarTokenWS);

        // Iniciar servidor WebSocket
        io.on('connection', onConnection);

        // Iniciar servidores
        httpServer.listen(CONFIG.PUERTO_HTTP, () => {
            console.log(`💻 Servidor HTTP en puerto: ${CONFIG.PUERTO_HTTP}`);
        });

        httpsServer.listen(CONFIG.PUERTO_HTTPS, () => {
            console.log(`💻 Servidor HTTPS en puerto: ${CONFIG.PUERTO_HTTPS}`);
            loadModels().then((_val) => {
                console.log('Modelos cargados correctamente'); 
            })
        });
    } catch (error: any) {
        throw error;
    }
}

async function loadModels() {
    return Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk("public/models"),
        faceapi.nets.faceLandmark68Net.loadFromDisk("public/models"),
        faceapi.nets.faceRecognitionNet.loadFromDisk("public/models"),
        faceapi.nets.faceExpressionNet.loadFromDisk("public/models"),
        faceapi.nets.ssdMobilenetv1.loadFromDisk("public/models")
    ])
}