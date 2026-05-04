import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  obtenerTodos,
  obtenerUno,
  crear,
  modificar,
  modificarEstado,
  probarConexion,
} from "../controllers/dispositivosBiostar.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), obtenerTodos);
router.get("/:id", validarTokenYRol([1], true), obtenerUno);
router.post("/", validarTokenYRol([1], true), crear);
router.post("/probar-conexion", validarTokenYRol([1], true), probarConexion);
router.post("/probar-conexion/:id", validarTokenYRol([1], true), probarConexion);
router.put("/:id", validarTokenYRol([1], true), modificar);
router.patch("/:id", validarTokenYRol([1], true), modificarEstado);

export default router;
