import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { obtenerEstadoCampo, obtenerMisRegistrosCampo, obtenerReportesCampo, registrarMovimientoCampo } from "../controllers/campo.controller";

const router = Router();

router.get("/estado", validarTokenYRol([1, 12]), obtenerEstadoCampo);
router.get("/mis-registros", validarTokenYRol([1, 12]), obtenerMisRegistrosCampo);
router.post("/registrar", validarTokenYRol([1, 12]), registrarMovimientoCampo);
router.get("/reportes", validarTokenYRol([1]), obtenerReportesCampo);

export default router;
