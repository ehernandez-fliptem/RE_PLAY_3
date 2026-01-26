import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    modificar,
    modificarEstado,
    crear,
    obtenerUno,
    cargarFormato,
    cargarProgramacionUsuarios,
    descargarFormato,
    desbloquear,
    obtenerTodosActivos,
    obtenerQR,
    obtenerFormEditarVisitante,
    anonimizar,
} from "../controllers/visitantes.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 7]), obtenerTodosActivos);
router.get("/descargar-formato", validarTokenYRol([1]), descargarFormato);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarVisitante);
router.get('/qr/:id', validarTokenYRol([1, 2, 10]), obtenerQR);
router.get('/qr/', validarTokenYRol([10]), obtenerQR);
router.get("/:id", validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarTokenYRol([1, 2]), crear);
router.post("/cargar-formato", validarTokenYRol([1]), cargarFormato);
router.post("/programacion", validarTokenYRol([1]), cargarProgramacionUsuarios);
router.put("/:id", validarTokenYRol([1, 2]), modificar);
// router.patch("/anonimizar/:id", validarTokenYRol([1]), anonimizar);
router.patch("/desbloquear/:id", validarTokenYRol([1]), desbloquear);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);

export default router;