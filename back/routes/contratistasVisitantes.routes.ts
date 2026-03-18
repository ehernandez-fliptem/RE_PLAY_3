import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    obtenerUno,
    crear,
    modificar,
    cargarFormato,
    descargarFormato,
    cargarProgramacionVisitantes,
    verificar,
    rechazar,
    corregir,
} from "../controllers/contratistasVisitantes.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 11]), obtenerTodos);
router.get("/descargar-formato", validarTokenYRol([1, 11]), descargarFormato);
router.post("/cargar-formato", validarTokenYRol([1, 11]), cargarFormato);
router.post("/programacion", validarTokenYRol([1, 11]), cargarProgramacionVisitantes);
router.patch("/verificar/:id", validarTokenYRol([1, 11]), verificar);
router.patch("/rechazar/:id", validarTokenYRol([1, 11]), rechazar);
router.patch("/corregir/:id", validarTokenYRol([11]), corregir);
router.get("/:id", validarTokenYRol([1, 11]), obtenerUno);
router.post("/", validarTokenYRol([1, 11]), crear);
router.put("/:id", validarTokenYRol([1, 11]), modificar);

export default router;
