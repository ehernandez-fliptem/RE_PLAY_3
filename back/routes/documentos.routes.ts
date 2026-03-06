import { Router } from "express";
import { obtenerTodosReportes, obtenerTodosPorUsuario, crear, obtenerUno, obtenerFormEditarDocumento, modificar, obtenerUnoSolodocumento, obtenerFormNuevoDocumento } from "../controllers/documentos.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.get("/usuario", validarTokenYRol([1, 2, 10]), obtenerTodosPorUsuario);
router.get("/form-nuevo", validarTokenYRol([1, 2, 10]), obtenerFormNuevoDocumento);
router.get("/:id", validarTokenYRol([1, 2, 10]), obtenerUno);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarDocumento);
router.get("/solo-documento/:id", validarTokenYRol([1, 2, 4, 5, 10]), obtenerUnoSolodocumento);

router.post("/reportes", validarTokenYRol([1, 2, 10]), obtenerTodosReportes);
router.post("/", validarTokenYRol([1, 2, 10]), crear);

router.put("/:id", validarTokenYRol([1, 2]), modificar);

export default router;


