import { Router } from "express";
import {
    obtenerDatos,
    obtenerOCR
} from "../controllers/ocr.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.post('/', validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerDatos);
router.post('/nombre', validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerOCR);

export default router;
