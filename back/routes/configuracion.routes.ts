import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  obtener,
  modificar,
  obtenerIntegraciones,
  modificarColecciones,
  modificarIntegraciones,
  crearRolPersonalizado,
  eliminarRolPersonalizado,
} from "../controllers/configuracion.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), obtener);
router.get("/integraciones", validarTokenYRol([1], true), obtenerIntegraciones);
router.put("/integraciones", validarTokenYRol([1], true), modificarIntegraciones);
router.put("/", validarTokenYRol([1], true), modificar);
router.put("/colecciones", validarTokenYRol([1], true), modificarColecciones);
router.post("/roles/personalizado", validarTokenYRol([1], true), crearRolPersonalizado);
router.delete("/roles/personalizado/:rol", validarTokenYRol([1], true), eliminarRolPersonalizado);

export default router;
