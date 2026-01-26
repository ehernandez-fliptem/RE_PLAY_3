export interface CertificateOptions {
    key: Buffer;
    cert: Buffer;
    ca?: Buffer;
}

export interface WatchOptions {
    usePolling: boolean;
    interval: number;
    binaryInterval: number;
    stabilityThreshold: number;
    pollInterval: number;
}

export interface CertificateManagerOptions {
    watchOptions?: Partial<WatchOptions>;
    certPaths: {
        key: string;
        cert: string;
        ca?: string;
    };
}