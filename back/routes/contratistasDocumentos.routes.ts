import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerMi,
    guardarMi,
    verificar,
    rechazar,
    revertir,
} from "../controllers/contratistasDocumentos.controller";

const router = Router();

router.get("/", validarTokenYRol([1, 11]), obtenerMi);
router.put("/", validarTokenYRol([1, 11]), guardarMi);
router.patch("/verificar/:id", validarTokenYRol([1]), verificar);
router.patch("/rechazar/:id", validarTokenYRol([1]), rechazar);
router.patch("/revertir/:id", validarTokenYRol([1]), revertir);

export default router;
