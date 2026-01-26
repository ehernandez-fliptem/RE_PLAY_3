import { Types } from 'mongoose';

export interface DecodedTokenUser {
    id: Types.ObjectId | string;
    iat: number;
    exp: number;
}

export interface DecodedTokenExternal {
    correo: string;
    iat: number;
    exp: number;
}