import { Router } from "express";
import { obtenerTodosReportes, obtenerTodosPorUsuario, crear, obtenerUno, obtenerFormEditarDocumento, modificar, obtenerUnoSolodocumento, obtenerFormNuevoDocumento } from "../controllers/documentos.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.get("/usuario", validarTokenYRol([10]), obtenerTodosPorUsuario);
router.get("/form-nuevo", validarTokenYRol([10]), obtenerFormNuevoDocumento);
router.get("/:id", validarTokenYRol([7, 10]), obtenerUno);
router.get("/form-editar/:id", validarTokenYRol([7]), obtenerFormEditarDocumento);
router.get("/solo-documento/:id", validarTokenYRol([1, 2, 4, 5, 6, 7, 10]), obtenerUnoSolodocumento);

router.post("/reportes", validarTokenYRol([7, 10]), obtenerTodosReportes);
router.post("/", validarTokenYRol([7, 10]), crear);

router.put("/:id", validarTokenYRol([7]), modificar);

export default router;
