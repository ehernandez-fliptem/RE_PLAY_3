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
    obtenerResumenGruposBiostarRegistrados,
    obtenerFormNuevoEmpleado,
    obtenerQR,
    obtenerAnfitriones,
    anonimizar,
    obtenerBiometriaEmpleado,
    registrarHuellaEmpleadoPanel,
    probarSyncHuellaCruzada,
    reenviarHuellaEmpleadoPanel,
    abrirUiEnrollBiostar,
    registrarTarjetaEmpleadoPanel,
    eliminarTarjetaEmpleadoPanel,
    reintentarSync,
    previewSyncBiostar,
    importarSyncBiostar,
    iniciarSyncHuellasHikvision,
    obtenerEstadoSyncHuellasHikvision,
    eliminarPermanente,
} from "../controllers/empleados.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2]), obtenerTodos);
router.get("/activos", validarTokenYRol([1, 2]), obtenerTodosActivos);
router.get("/directorio", validarTokenYRol([1, 2]), obtenerTodosDirectorio);
router.get("/biostar-grupos-resumen", validarTokenYRol([1, 2]), obtenerResumenGruposBiostarRegistrados);
router.get("/biostar-sync/preview", validarTokenYRol([1, 2]), previewSyncBiostar);
router.post("/biostar-sync/import", validarTokenYRol([1, 2]), importarSyncBiostar);
router.get("/anfitriones", validarTokenYRol([1, 2, 11]), obtenerAnfitriones);
router.get("/descargar-formato", validarTokenYRol([1, 2]), descargarFormato);
router.get("/form-nuevo", validarTokenYRol([1, 2]), obtenerFormNuevoEmpleado);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarEmpleado);
router.get('/qr/:id', validarTokenYRol([1, 2]), obtenerQR);
router.get('/biometria/:id', validarTokenYRol([1, 2]), obtenerBiometriaEmpleado);
router.get("/:id", validarTokenYRol([1, 2]), obtenerUno);
router.post("/", validarTokenYRol([1, 2]), crear);
router.post("/:id/reintentar-sync", validarTokenYRol([1, 2]), reintentarSync);
router.post("/cargar-formato", validarTokenYRol([1, 2]), cargarFormato);
router.post("/programacion", validarTokenYRol([1, 2]), cargarProgramacionEmpleados);
router.put("/:id", validarTokenYRol([1, 2]), modificar);
router.put("/biometria/huella/:id", validarTokenYRol([1, 2]), registrarHuellaEmpleadoPanel);
router.post("/biometria/huella/prueba-cruzada/:id", validarTokenYRol([1, 2]), probarSyncHuellaCruzada);
router.post("/biometria/biostar/abrir-ui/:id", validarTokenYRol([1, 2]), abrirUiEnrollBiostar);
router.put("/biometria/huella/reenviar/:id", validarTokenYRol([1, 2]), reenviarHuellaEmpleadoPanel);
router.post("/biometria/huella/sync-hikvision/iniciar", validarTokenYRol([1, 2]), iniciarSyncHuellasHikvision);
router.get("/biometria/huella/sync-hikvision/estado", validarTokenYRol([1, 2]), obtenerEstadoSyncHuellasHikvision);
router.put("/biometria/tarjeta/:id", validarTokenYRol([1, 2]), registrarTarjetaEmpleadoPanel);
router.delete("/biometria/tarjeta/:id/:tarjetaId", validarTokenYRol([1, 2]), eliminarTarjetaEmpleadoPanel);
router.patch('/anonimizar/:id', validarTokenYRol([1, 2]), anonimizar);
router.patch("/desbloquear/:id", validarTokenYRol([1, 2]), desbloquear);
router.patch("/eliminar-permanente/:id", validarTokenYRol([1, 2]), eliminarPermanente);
router.patch("/:id", validarTokenYRol([1, 2]), modificarEstado);

export default router;

