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

router.get("/form-reportes", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerFormEventos);
router.get("/form-reporte-horas", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerFormReporteHoras);
router.get("/kiosco/paneles", validarTokenYRol([1, 2, 5, 6]), obtenerPanelesKiosco);
router.get("/paneles-alerta-reloj", validarTokenYRol([1], true), obtenerAlertasRelojPaneles);
router.get("/kiosco", validarTokenYRol([1, 2]), obtenerTodosKiosco);
router.get("/imagen/:id", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerImagen);
router.get("/:id", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerUno);
router.post("/", validarTokenYRol([1, 2, 4, 5, 6, 7]), crear);
router.post("/reporte-horas/individual/:id", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerReporteIndividual);
router.post("/reportes-horas", validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerReporteHoras);
router.post("/autorizar", validarTokenYRol([1, 2, 4, 5, 6, 7]), autorizarCheck);
router.post("/reportes", validarTokenYRol([1, 2, 5, 6]), obtenerTodosPorFiltro);
router.post("/panel", validarTokenYRol([1]), guardarEventoPanel);
router.post("/validar-qr", validarTokenYRol([1, 2, 4, 5, 6, 7]), validarQr);
router.post("/validar-rostro", validarTokenYRol([1, 2, 4, 5, 6, 7]), validarRostro);

export default router;
