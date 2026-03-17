import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    crearSolicitud,
    obtenerSolicitudesContratista,
    obtenerPendientes,
    obtenerSolicitud,
    revisarSolicitud,
} from "../controllers/contratistasSolicitudes.controller";

const router = Router();

// Contratista
router.get("/", validarTokenYRol([1, 11]), obtenerSolicitudesContratista);
router.post("/", validarTokenYRol([1, 11]), crearSolicitud);

// Admin
router.get("/pendientes", validarTokenYRol([1, 2]), obtenerPendientes);
router.get("/:id", validarTokenYRol([1, 2, 11]), obtenerSolicitud);
router.post("/:id/revisar", validarTokenYRol([1, 2]), revisarSolicitud);

export default router;
