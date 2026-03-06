import { Router } from "express";
import {
    obtenerDatos,
    obtenerOCR
} from "../controllers/ocr.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.post('/', validarTokenYRol([1, 2, 4, 5]), obtenerDatos);
router.post('/nombre', validarTokenYRol([1, 2, 4, 5]), obtenerOCR);

export default router;

