import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodosPorFiltro,
    obtenerImagen,
    crear,
    validarQr,
    obtenerFormReporteHoras,
    guardarEventoPanel,
    obtenerFormEventos,
    autorizarCheck,
    obtenerUno,
    obtenerReporteHoras,
    obtenerReporteIndividual,
    obtenerTodosKiosco,
    obtenerPanelesKiosco,
    obtenerAlertasRelojPaneles,
    validarRostro,
} from "../controllers/eventos.controller";

const router = Router();

router.get("/form-reportes", validarTokenYRol([1, 2, 5]), obtenerFormEventos);
router.get("/form-reporte-horas", validarTokenYRol([1, 2, 5]), obtenerFormReporteHoras);
router.get("/kiosco/paneles", validarTokenYRol([1, 2, 5]), obtenerPanelesKiosco);
router.get("/paneles-alerta-reloj", validarTokenYRol([1], true), obtenerAlertasRelojPaneles);
router.get("/kiosco", validarTokenYRol([1, 2, 5]), obtenerTodosKiosco);
router.get("/imagen/:id", validarTokenYRol([1, 2, 5]), obtenerImagen);
router.get("/:id", validarTokenYRol([1, 2, 5]), obtenerUno);
router.post("/", validarTokenYRol([1, 2, 5]), crear);
router.post("/reporte-horas/individual/:id", validarTokenYRol([1, 2, 5]), obtenerReporteIndividual);
router.post("/reportes-horas", validarTokenYRol([1, 2, 5]), obtenerReporteHoras);
router.post("/autorizar", validarTokenYRol([1, 2, 5]), autorizarCheck);
router.post("/reportes", validarTokenYRol([1, 2, 5]), obtenerTodosPorFiltro);
router.post("/panel", validarTokenYRol([1]), guardarEventoPanel);
router.post("/validar-qr", validarTokenYRol([1, 2, 5]), validarQr);
router.post("/validar-rostro", validarTokenYRol([1, 2, 5]), validarRostro);

export default router;


