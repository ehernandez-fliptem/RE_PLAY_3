import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    obtenerUno,
    crear,
    modificar,
    modificarEstado,
    probarConexion,
    obtenerUnoFormEditar,
    obtenerFormNuevaCamara,
} from "../controllers/camaras.controller";

const router = Router();

router.get("/", validarTokenYRol([1]), obtenerTodos);
router.get("/form-nuevo", validarTokenYRol([1]), obtenerFormNuevaCamara);
router.get("/:id", validarTokenYRol([1]), obtenerUno);
router.get("/form-editar/:id", validarTokenYRol([1]), obtenerUnoFormEditar);
router.post("/", validarTokenYRol([1]), crear);
router.post("/probar-conexion", validarTokenYRol([1]), probarConexion);
router.post("/probar-conexion/:id", validarTokenYRol([1]), probarConexion);
router.put("/:id", validarTokenYRol([1]), modificar);
router.patch("/:id", validarTokenYRol([1]), modificarEstado);

export default router;