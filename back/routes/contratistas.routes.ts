import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    obtenerTodosActivos,
    obtenerUno,
    crear,
    modificar,
    modificarEstado,
    reenviarCorreoAcceso,
} from "../controllers/contratistas.controller";

const router = Router();

router.get("/", validarTokenYRol([1]), obtenerTodos);
router.get("/activos", validarTokenYRol([1]), obtenerTodosActivos);
router.get("/:id", validarTokenYRol([1]), obtenerUno);
router.post("/", validarTokenYRol([1]), crear);
router.patch("/reenviar/:id", validarTokenYRol([1]), reenviarCorreoAcceso);
router.put("/:id", validarTokenYRol([1]), modificar);
router.patch("/:id", validarTokenYRol([1]), modificarEstado);

export default router;
