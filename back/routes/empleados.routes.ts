import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    modificar,
    modificarEstado,
    crear,
    obtenerUno,
    obtenerFormEditarEmpleado,
    cargarFormato,
    cargarProgramacionEmpleados,
    descargarFormato,
    desbloquear,
    obtenerTodosActivos,
    obtenerTodosDirectorio,
    obtenerFormNuevoEmpleado,
    obtenerQR,
    obtenerAnfitriones,
    anonimizar,
} from "../controllers/empleados.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 2, 5, 6, 7]), obtenerTodosActivos);
router.get("/directorio", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerTodosDirectorio);
router.get("/anfitriones", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerAnfitriones);
router.get("/descargar-formato", validarTokenYRol([1]), descargarFormato);
router.get("/form-nuevo", validarTokenYRol([1, 2]), obtenerFormNuevoEmpleado);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarEmpleado);
router.get('/qr/:id', validarTokenYRol([1]), obtenerQR);
router.get("/:id", validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarTokenYRol([1, 2]), crear);
router.post("/cargar-formato", validarTokenYRol([1]), cargarFormato);
router.post("/programacion", validarTokenYRol([1]), cargarProgramacionEmpleados);
router.put("/:id", validarTokenYRol([1, 2]), modificar);
router.patch('/anonimizar/:id', validarTokenYRol([1]), anonimizar);
router.patch("/desbloquear/:id", validarTokenYRol([1]), desbloquear);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);

export default router;
