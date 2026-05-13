import { Request } from "express";

export interface UserRequest extends Request {
    userId: string;
    accessId?: string;
    tabletQrMode?: "entrada" | "salida" | "ambos";
    isMaster: boolean;
    role: number[]
    device: { type: string; name: string };
}
