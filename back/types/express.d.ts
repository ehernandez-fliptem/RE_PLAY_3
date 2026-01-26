import { Request } from "express";

export interface UserRequest extends Request {
    userId: string;
    accessId?: string;
    isMaster: boolean;
    role: number[]
    device: { type: string; name: string };
}