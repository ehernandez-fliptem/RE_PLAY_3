import { Router } from "express";
import { enviarCodigo, modificarContrasena, validarCodigo } from "../controllers/recuperaciones.controller";

const router = Router();

router.post("/enviar-codigo", enviarCodigo);
router.post("/validar-codigo", validarCodigo);
router.put("/modificar-contrasena", modificarContrasena);

export default router;