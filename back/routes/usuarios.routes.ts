import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    modificar,
    modificarEstado,
    crear,
    obtenerUno,
    obtenerFormEditarUsuario,
    cargarFormato,
    cargarProgramacionUsuarios,
    descargarFormato,
    desbloquear,
    obtenerTodosActivos,
    obtenerTodosDirectorio,
    obtenerFormNuevoUsuario,
    obtenerQR,
    obtenerAnfitriones,
    anonimizar,
} from "../controllers/usuarios.controller";

const router = Router();

router.get("/", validarTokenYRol([1]), obtenerTodos);
router.get("/activos", validarTokenYRol([1]), obtenerTodosActivos);
router.get("/directorio", validarTokenYRol([1, 2]), obtenerTodosDirectorio);
router.get("/anfitriones", validarTokenYRol([1, 2, 4, 5]), obtenerAnfitriones);
router.get("/descargar-formato", validarTokenYRol([1]), descargarFormato);
router.get("/form-nuevo", validarTokenYRol([1]), obtenerFormNuevoUsuario);
router.get("/form-editar/:id", validarTokenYRol([1]), obtenerFormEditarUsuario);
router.get('/qr/:id', validarTokenYRol([1]), obtenerQR);
router.get("/:id", validarTokenYRol([1]), obtenerUno);
router.post("/", validarTokenYRol([1]), crear);
router.post("/cargar-formato", validarTokenYRol([1]), cargarFormato);
router.post("/programacion", validarTokenYRol([1]), cargarProgramacionUsuarios);
router.put("/:id", validarTokenYRol([1]), modificar);
router.patch('/anonimizar/:id', validarTokenYRol([1]), anonimizar);
router.patch("/desbloquear/:id", validarTokenYRol([1]), desbloquear);
router.patch("/:id", validarTokenYRol([1]), modificarEstado);
router.patch("/:id", validarTokenYRol([1]), modificarEstado);

export default router;

