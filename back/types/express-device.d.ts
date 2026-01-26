declare module 'express-device' {
    import { RequestHandler } from 'express';

    interface Device {
        type: string;
        name: string;
        is(type: string): boolean;
    }

    interface DeviceCapture {
        capture(): RequestHandler;
    }

    const device: DeviceCapture;
    export default device;
}