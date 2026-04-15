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
    revertirCreacion,
} from "../controllers/visitantes.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2, 4, 5]), obtenerGrid);
router.get("/todos", validarTokenYRol([1, 2, 4, 5]), obtenerTodos);
//router.get("/", validarTokenYRol([1, 2, 4, 5]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 2, 4, 5]), obtenerTodosActivos);
router.get("/descargar-formato", validarTokenYRol([1, 2]), descargarFormato);
router.get("/form-editar/:id", validarTokenYRol([1, 2, 4, 5]), obtenerFormEditarVisitante);
router.get('/qr/:id', validarTokenYRol([1, 2, 4, 5, 10]), obtenerQR);
router.get('/qr/', validarTokenYRol([10]), obtenerQR);
router.get("/:id", validarTokenYRol([1, 2, 4, 5]), obtenerUno);
router.post("/", validarTokenYRol([1, 2, 4, 5]), crear);
router.patch("/verificar/:id", validarTokenYRol([1, 2, 4, 5]), verificar);
router.post("/cargar-formato", validarTokenYRol([1, 2]), cargarFormato);
router.post("/programacion", validarTokenYRol([1, 2]), cargarProgramacionUsuarios);
router.put("/:id", validarTokenYRol([1, 2, 4, 5]), modificar);
// router.patch("/anonimizar/:id", validarTokenYRol([1, 2]), anonimizar);
router.patch("/revertir-creacion/:id", validarTokenYRol([1, 2, 4, 5]), revertirCreacion);
router.patch("/bloquear/:id", validarTokenYRol([1, 2]), bloquearBack);
router.patch("/desbloquear/:id", validarTokenYRol([1, 2]), desbloquearBack);
router.patch("/:id", validarTokenYRol([1, 2, 4, 5]), modificarEstado);

export default router;

