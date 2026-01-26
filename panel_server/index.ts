import express, { Request, Response } from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import http from 'http';

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// ENDPOINTS
import panelRoutes from './routes/panel.routes';
import citasRoutes from './routes/citas.routes';
import usuariosRoutes from './routes/usuarios.routes';

import { CONFIG } from './config';

const app: express.Application = express();
const httpServer = http.createServer(app);

app.use(cors({
    origin: 'http://localhost:80'
}));

app.use(morgan('common'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'dist/')));

app.use('/api/panel/', panelRoutes);
app.use('/api/panel/citas', citasRoutes);
app.use('/api/panel/usuarios', usuariosRoutes);
// Rutas no encontradas
app.use((_: Request, res: Response) => {
    res.status(404).json({ mensaje: "Recurso no encontrado." });
});

// Iniciar servidores
httpServer.listen(CONFIG.PUERTO_HTTP, () => {
    console.log(`Servidor del panel en puerto: ${CONFIG.PUERTO_HTTP}`);
});