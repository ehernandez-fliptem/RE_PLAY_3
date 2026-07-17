import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { obtenerTokenAgente, obtenerPlantillasAgente } from "../controllers/biometriaAgente.controller";

const router = Router();

// Rol 13 (Tablet/Caseta) es quien opera el lector; 1 y 2 para diagnosticar
// desde una sesion de administrador o recepcion sin montar una caseta.
router.get("/token", validarTokenYRol([1, 2, 13]), obtenerTokenAgente);
router.get("/plantillas", validarTokenYRol([1, 2, 13]), obtenerPlantillasAgente);

export default router;
