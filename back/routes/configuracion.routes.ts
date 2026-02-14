import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { obtener, modificar, obtenerIntegraciones, modificarColecciones } from "../controllers/configuracion.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), obtener);
router.get("/integraciones", validarTokenYRol([1], true), obtenerIntegraciones);
router.put("/", validarTokenYRol([1], true), modificar);
router.put("/colecciones", validarTokenYRol([1], true), modificarColecciones);

export default router;
