import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { obtener, modificar, obtenerIntegraciones, modificarColecciones } from "../controllers/configuracion.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtener);
router.get("/integraciones", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerIntegraciones);
router.put("/", validarTokenYRol([1]), modificar);
router.put("/colecciones", validarTokenYRol([1]), modificarColecciones);

export default router;