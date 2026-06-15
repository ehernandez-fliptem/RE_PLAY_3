import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { validarCapacitacionPublicaActiva } from "../middlewares/capacitacionPublica";
import {
    crear,
    duplicar,
    eliminar,
    modificar,
    modificarEstado,
    obtenerPublica,
    obtenerResultados,
    obtenerTodos,
    obtenerUno,
    registrarResultado,
} from "../controllers/capacitaciones.controller";

const router = Router();

router.get("/publica/:slug", validarCapacitacionPublicaActiva, obtenerPublica);
router.post("/publica/:id/resultados", validarCapacitacionPublicaActiva, registrarResultado);

router.get("/", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), obtenerTodos);
router.get("/:id/resultados", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), obtenerResultados);
router.get("/:id", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), crear);
router.post("/:id/duplicar", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), duplicar);
router.put("/:id", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), modificar);
router.patch("/:id/estado", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), modificarEstado);
router.delete("/:id", validarCapacitacionPublicaActiva, validarTokenYRol([1, 2]), eliminar);

export default router;
