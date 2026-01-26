import mongoose from 'mongoose';
import { CONFIG } from './config';

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('🔗 Conectado a la base de datos Flipbot');
    } catch (error: any) {
        throw error;
    }
};
