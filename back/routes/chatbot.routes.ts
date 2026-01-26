import { Router } from "express";
import { validarTokenYRol } from '../middlewares/validarToken';
import { enviarMensaje } from '../controllers/chatbot.controller';

const router = Router();

router.post('/', validarTokenYRol([1, 2, 3, 4, 5, 6, 7]), enviarMensaje);

export default router;