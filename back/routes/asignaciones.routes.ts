import { Router } from "express";
import {
    obtenerTodos,
    obtenerUno,
    crear,
    modificar,
    modificarEstado,
    obtenerFormNuevaAsignacion,
    obtenerFormEditarAsignacion,
} from "../controllers/asignaciones.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.get("/", validarTokenYRol([1, 2]), obtenerTodos);
router.get("/form-nuevo", validarTokenYRol([1, 2]), obtenerFormNuevaAsignacion);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarAsignacion);
router.get("/:id", validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarTokenYRol([1, 2]), crear);
router.put("/:id", validarTokenYRol([1, 2]), modificar);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);

export default router;