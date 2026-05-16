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
    resincronizarVisitantePaneles,
    eliminarPermanente,
    reenviarCorreoAcceso,
} from "../controllers/visitantes.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2, 4, 5, 13]), obtenerGrid);
router.get("/todos", validarTokenYRol([1, 2, 4, 5, 13]), obtenerTodos);
//router.get("/", validarTokenYRol([1, 2, 4, 5]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 2, 4, 5, 13]), obtenerTodosActivos);
router.get("/descargar-formato", validarTokenYRol([1, 2]), descargarFormato);
router.get("/form-editar/:id", validarTokenYRol([1, 2, 4, 5, 13]), obtenerFormEditarVisitante);
router.get('/qr/:id', validarTokenYRol([1, 2, 4, 5, 10, 13]), obtenerQR);
router.get('/qr/', validarTokenYRol([10]), obtenerQR);
router.get("/:id", validarTokenYRol([1, 2, 4, 5, 13]), obtenerUno);
router.post("/", validarTokenYRol([1, 2, 4, 5, 13]), crear);
router.patch("/verificar/:id", validarTokenYRol([1, 2, 4, 5, 13]), verificar);
router.patch("/resync/:id", validarTokenYRol([1, 2, 4, 5, 13]), resincronizarVisitantePaneles);
router.patch("/reenviar/:id", validarTokenYRol([1, 2, 4, 5, 13]), reenviarCorreoAcceso);
router.post("/cargar-formato", validarTokenYRol([1, 2]), cargarFormato);
router.post("/programacion", validarTokenYRol([1, 2]), cargarProgramacionUsuarios);
router.put("/:id", validarTokenYRol([1, 2, 4, 5, 13]), modificar);
// router.patch("/anonimizar/:id", validarTokenYRol([1, 2]), anonimizar);
router.patch("/revertir-creacion/:id", validarTokenYRol([1, 2, 4, 5, 13]), revertirCreacion);
router.patch("/bloquear/:id", validarTokenYRol([1, 2]), bloquearBack);
router.patch("/desbloquear/:id", validarTokenYRol([1, 2]), desbloquearBack);
router.patch("/eliminar-permanente/:id", validarTokenYRol([1, 2, 4, 5, 13]), eliminarPermanente);
router.patch("/:id", validarTokenYRol([1, 2, 4, 5, 13]), modificarEstado);

export default router;

