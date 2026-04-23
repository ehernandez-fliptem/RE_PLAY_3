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
    obtenerBiometriaEmpleado,
    registrarHuellaEmpleadoPanel,
    reenviarHuellaEmpleadoPanel,
    registrarTarjetaEmpleadoPanel,
    eliminarTarjetaEmpleadoPanel,
} from "../controllers/empleados.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 2]), obtenerTodosActivos);
router.get("/directorio", validarTokenYRol([1, 2]), obtenerTodosDirectorio);
router.get("/anfitriones", validarTokenYRol([1, 2, 11]), obtenerAnfitriones);
router.get("/descargar-formato", validarTokenYRol([1, 2]), descargarFormato);
router.get("/form-nuevo", validarTokenYRol([1, 2]), obtenerFormNuevoEmpleado);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarEmpleado);
router.get('/qr/:id', validarTokenYRol([1, 2]), obtenerQR);
router.get('/biometria/:id', validarTokenYRol([1, 2]), obtenerBiometriaEmpleado);
router.get("/:id", validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarTokenYRol([1, 2]), crear);
router.post("/cargar-formato", validarTokenYRol([1, 2]), cargarFormato);
router.post("/programacion", validarTokenYRol([1, 2]), cargarProgramacionEmpleados);
router.put("/:id", validarTokenYRol([1, 2]), modificar);
router.put("/biometria/huella/:id", validarTokenYRol([1, 2]), registrarHuellaEmpleadoPanel);
router.put("/biometria/huella/reenviar/:id", validarTokenYRol([1, 2]), reenviarHuellaEmpleadoPanel);
router.put("/biometria/tarjeta/:id", validarTokenYRol([1, 2]), registrarTarjetaEmpleadoPanel);
router.delete("/biometria/tarjeta/:id/:tarjetaId", validarTokenYRol([1, 2]), eliminarTarjetaEmpleadoPanel);
router.patch('/anonimizar/:id', validarTokenYRol([1, 2]), anonimizar);
router.patch("/desbloquear/:id", validarTokenYRol([1, 2]), desbloquear);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);

export default router;

