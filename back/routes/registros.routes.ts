import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    obtenerFormNuevoRegistro,
    obtenerUltimoRegistro,
    crear,
    obtenerUno,
    cancelar,
    obtenerFormEditarRegistro,
    marcarNuevoAcceso,
    modificarCita,
    finalizar,
    obtenerReportes,
    editarCita,
    obtenerAccesosPorAnfitrion,
    enviarCorreoCita,
    validarTokenVisitante,
    crearRegistroVisitante,
} from "../controllers/registros.controller";
import { obtenerReporteHoras } from "../controllers/eventos.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 2, 4, 5, 6, 7, 10]), obtenerTodos);
router.get("/ultimo-registro", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerUltimoRegistro);
router.get("/form-nuevo", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerFormNuevoRegistro);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarRegistro);
router.get("/:id", validarTokenYRol([1, 2, 4, 5, 6, 7, 10]), obtenerUno);
router.post("/reportes", validarTokenYRol([1, 2, 5]), obtenerReportes);
router.post("/accesos-anfitrion", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerAccesosPorAnfitrion);
router.post("/reporte-horas", validarTokenYRol([1, 2, 5, 6]), obtenerReporteHoras);
router.post("/enviar-liga-registro", validarTokenYRol([1, 2, 4, 5, 6, 7]), enviarCorreoCita);
router.post("/validar-token-registro", validarTokenVisitante);
router.post("/visitante", crearRegistroVisitante);
router.post("/", validarTokenYRol([1, 2, 4, 5, 6, 7]), crear);
router.put("/cancelar/:id", validarTokenYRol([1, 2]), cancelar);
router.put("/:id", validarTokenYRol([1, 2]), editarCita);
router.put("/modificar/:id", validarTokenYRol([1, 2]), modificarCita);
router.put("/finalizar/:id", validarTokenYRol([1, 2]), finalizar);
router.patch("/acceso/:id", validarTokenYRol([1, 2]), marcarNuevoAcceso);
// router.patch("/autorizar-sin-qr/:id", validarTokenYRol([1, 2]), autorizacionSinQR);

export default router;