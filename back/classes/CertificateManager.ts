import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as chokidar from 'chokidar';
import { Express } from 'express';
import {
    CertificateOptions,
    CertificateManagerOptions,
    WatchOptions
} from '../types/certificate';
import { CONFIG } from '../config';
import { fecha } from '../middlewares/log';

export class CertificateManager {
    private httpsServer: https.Server | null = null;
    private watcher: chokidar.FSWatcher | null = null;
    private changeTimeout: NodeJS.Timeout | null = null;
    private app: Express;
    private options: CertificateManagerOptions;
    private defaultWatchOptions: WatchOptions = {
        usePolling: false,
        interval: 2000,
        binaryInterval: 2000,
        stabilityThreshold: 2500,
        pollInterval: 500
    };

    constructor(app: Express, options: CertificateManagerOptions) {
        this.app = app;
        this.options = {
            ...options,
            watchOptions: { ...this.defaultWatchOptions, ...options.watchOptions }
        };

        this.initializeServer();
        this.setupWatcher();
    }

    /**
     * Inicializa el servidor HTTPS con los certificados actuales
     */
    private initializeServer(): void {
        try {
            const httpsOptions = this.loadCertificates();
            this.httpsServer = https.createServer(httpsOptions, this.app);
            console.log('✅ Servidor HTTPS inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando servidor HTTPS:', error);
            throw error;
        }
    }

    /**
     * Carga los certificados desde los archivos
     */
    private loadCertificates(): CertificateOptions {
        try {
            const certOptions: CertificateOptions = {
                key: fs.readFileSync(this.options.certPaths.key),
                cert: fs.readFileSync(this.options.certPaths.cert)
            };

            if (this.options.certPaths.ca) {
                certOptions.ca = fs.readFileSync(this.options.certPaths.ca);
            }

            return certOptions;
        } catch (error) {
            console.error('❌ Error cargando certificados:', error);
            throw error;
        }
    }

    /**
     * Configura el watcher para monitorear cambios en los certificados
     */
    private setupWatcher(): void {
        const filesToWatch = [
            this.options.certPaths.key,
            this.options.certPaths.cert,
            ...(this.options.certPaths.ca ? [this.options.certPaths.ca] : [])
        ];

        try {
            this.watcher = chokidar.watch(filesToWatch, {
                persistent: true,
                ignoreInitial: true,
                awaitWriteFinish: {
                    stabilityThreshold: this.options.watchOptions!.stabilityThreshold!,
                    pollInterval: this.options.watchOptions!.pollInterval!
                },
                usePolling: this.options.watchOptions!.usePolling!,
                interval: this.options.watchOptions!.interval!,
                binaryInterval: this.options.watchOptions!.binaryInterval!
            });

            this.setupWatcherEvents();
            console.log('👀 Monitoreo de certificados iniciado');
        } catch (error) {
            console.error('❌ Error configurando watcher:', error);
        }
    }

    /**
     * Configura los eventos del watcher
     */
    private setupWatcherEvents(): void {
        if (!this.watcher) return;

        this.watcher
            .on('add', (filePath: string) => {
                console.log(`📁 Archivo añadido: ${path.basename(filePath)}`);
            })
            .on('change', (filePath: string) => {
                this.handleCertificateChange(filePath);
            })
            .on('unlink', (filePath: string) => {
                console.warn(`⚠️ Archivo eliminado: ${path.basename(filePath)}`);
            })
            .on('error', (error: any) => {
                console.error('❌ Error en el watcher:', error);
            });
    }

    /**
     * Maneja los cambios en los archivos de certificados
     */
    private handleCertificateChange(filePath: string): void {
        console.log(`🔄 [${fecha()}] Certificado modificado: ${path.basename(filePath)}`);

        // Debounce para múltiples cambios
        if (this.changeTimeout) {
            clearTimeout(this.changeTimeout);
        }

        this.changeTimeout = setTimeout(() => {
            this.reloadCertificates();
        }, 10000)
    }

    /**
     * Recarga los certificados sin reiniciar el servidor
     */
    public async reloadCertificates(): Promise<void> {
        console.log('🔄 Recargando certificados...');

        try {
            const newOptions = this.loadCertificates();

            if (this.httpsServer && typeof this.httpsServer.setSecureContext === 'function') {
                this.httpsServer.setSecureContext(newOptions);
                console.log('✅ Certificados recargados exitosamente');
            } else {
                console.warn('⚠️ setSecureContext no disponible, requiere reinicio completo');
                await this.restartServer();
            }
        } catch (error) {
            console.error('❌ Error recargando certificados:', error);
        }
    }

    /**
     * Reinicia el servidor completamente
     */
    private async restartServer(): Promise<void> {
        console.log('🔄 Reiniciando servidor...');

        return new Promise((resolve) => {
            if (this.httpsServer) {
                this.httpsServer.close(() => {
                    this.initializeServer();
                    if (this.httpsServer) {
                        this.httpsServer.listen(this.getPort(), () => {
                            console.log('✅ Servidor reiniciado correctamente');
                            resolve();
                        });
                    }
                });
            } else {
                this.initializeServer();
                resolve();
            }
        });
    }

    /**
     * Obtiene el puerto del servidor
     */
    private getPort(): number {
        const port = CONFIG.PUERTO_HTTPS || 443;
        return typeof port === 'string' ? parseInt(port) : port;
    }

    /**
     * Obtiene el servidor HTTPS
     */
    public getServer(): https.Server {
        if (!this.httpsServer) {
            throw new Error('Servidor HTTPS no inicializado');
        }
        return this.httpsServer;
    }

    public checkCertificatesExist(): boolean {
        try {
            const files = [
                this.options.certPaths.key,
                this.options.certPaths.cert,
                ...(this.options.certPaths.ca ? [this.options.certPaths.ca] : [])
            ];

            return files.every(file => fs.existsSync(file));
        } catch (error) {
            console.error('❌ Error verificando certificados:', error);
            return false;
        }
    }

    /**
     * Obtiene información de los certificados
     */
    public getCertificateInfo(): { exists: boolean; files: string[]; lastModified: Date | null } {
        try {
            const files = [
                this.options.certPaths.key,
                this.options.certPaths.cert,
                ...(this.options.certPaths.ca ? [this.options.certPaths.ca] : [])
            ];

            const exists = files.every(file => fs.existsSync(file));
            const lastModified = exists ?
                new Date(Math.max(...files.map(file => fs.statSync(file).mtimeMs))) :
                null;

            return {
                exists,
                files: files.map(file => path.basename(file)),
                lastModified
            };
        } catch (error) {
            console.error('❌ Error obteniendo información de certificados:', error);
            return { exists: false, files: [], lastModified: null };
        }
    }
}