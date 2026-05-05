import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  obtenerTodos,
  obtenerUno,
  obtenerUnoFormEditar,
  crear,
  modificar,
  modificarEstado,
  eliminar,
  probarConexion,
} from "../controllers/dispositivosSuprema.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), obtenerTodos);
router.get("/form-editar/:id", validarTokenYRol([1], true), obtenerUnoFormEditar);
router.get("/:id", validarTokenYRol([1], true), obtenerUno);
router.post("/", validarTokenYRol([1], true), crear);
router.post("/probar-conexion", validarTokenYRol([1], true), probarConexion);
router.post("/probar-conexion/:id", validarTokenYRol([1], true), probarConexion);
router.put("/:id", validarTokenYRol([1], true), modificar);
router.patch("/:id", validarTokenYRol([1], true), modificarEstado);
router.delete("/:id", validarTokenYRol([1], true), eliminar);

export default router;
