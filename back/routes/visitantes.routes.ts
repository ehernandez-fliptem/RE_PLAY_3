import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    obtenerGrid,
    modificar,
    modificarEstado,
    crear,
    obtenerUno,
    cargarFormato,
    cargarProgramacionUsuarios,
    descargarFormato,
    desbloquearBack,
    bloquearBack,
    obtenerTodosActivos,
    obtenerQR,
    obtenerFormEditarVisitante,
    anonimizar,
    verificar,
} from "../controllers/visitantes.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2]), obtenerGrid);
router.get("/todos", validarTokenYRol([1, 2]), obtenerTodos);
//router.get("/", validarTokenYRol([1, 2]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 7]), obtenerTodosActivos);
router.get("/descargar-formato", validarTokenYRol([1]), descargarFormato);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarVisitante);
router.get('/qr/:id', validarTokenYRol([1, 2, 10]), obtenerQR);
router.get('/qr/', validarTokenYRol([10]), obtenerQR);
router.get("/:id", validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarTokenYRol([1, 2]), crear);
router.patch("/verificar/:id", validarTokenYRol([1, 2]), verificar);
router.post("/cargar-formato", validarTokenYRol([1]), cargarFormato);
router.post("/programacion", validarTokenYRol([1]), cargarProgramacionUsuarios);
router.put("/:id", validarTokenYRol([1, 2]), modificar);
// router.patch("/anonimizar/:id", validarTokenYRol([1]), anonimizar);
router.patch("/bloquear/:id", validarTokenYRol([1]), bloquearBack);
router.patch("/desbloquear/:id", validarTokenYRol([1]), desbloquearBack);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);

export default router;
