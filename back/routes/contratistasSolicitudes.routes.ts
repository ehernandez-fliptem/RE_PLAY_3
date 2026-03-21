import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    crearSolicitud,
    validarSolicitud,
    obtenerVisitantesOcupados,
    obtenerResumenSolicitudesContratista,
    obtenerResumenSolicitudesAdmin,
    obtenerEmpresasSolicitudesAdmin,
    obtenerSolicitudesContratista,
    obtenerPendientes,
    obtenerSolicitud,
    revisarSolicitud,
} from "../controllers/contratistasSolicitudes.controller";

const router = Router();

// Contratista
router.get("/", validarTokenYRol([1, 11]), obtenerSolicitudesContratista);
router.get("/ocupados", validarTokenYRol([1, 11]), obtenerVisitantesOcupados);
router.get("/resumen", validarTokenYRol([1, 11]), obtenerResumenSolicitudesContratista);
router.post("/validar", validarTokenYRol([1, 11]), validarSolicitud);
router.post("/", validarTokenYRol([1, 11]), crearSolicitud);

// Admin
router.get("/pendientes", validarTokenYRol([1, 2]), obtenerPendientes);
router.get("/resumen-admin", validarTokenYRol([1, 2]), obtenerResumenSolicitudesAdmin);
router.get("/empresas-admin", validarTokenYRol([1, 2]), obtenerEmpresasSolicitudesAdmin);
router.get("/:id", validarTokenYRol([1, 2, 11]), obtenerSolicitud);
router.post("/:id/revisar", validarTokenYRol([1, 2]), revisarSolicitud);

export default router;
