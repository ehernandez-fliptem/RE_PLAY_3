import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    crearEmpresa,
    crearUsuario,
    crearConfiguracion,
    validarApp,
    obtenerInformacioAppYSesion,
    obtenerGenerales,
    obtenerTodosPisos,
    crearPiso,
    eliminarPiso,
    obtenerFormNuevoUsuario,
    obtenerTodosAccesos,
    crearAcceso,
    obtenerFormNuevaEmpresa,
    eliminarAcceso,
} from "../controllers/validacion.controller";

const router = Router();

router.get("/app", validarApp);
router.get("/session-config", validarTokenYRol([1, 2, 4, 5, 6, 7, 10]), obtenerInformacioAppYSesion);
router.get("/generales", obtenerGenerales);
router.get("/accesos", obtenerTodosAccesos);
router.get("/pisos", obtenerTodosPisos);
router.get("/usuario/form-nuevo", obtenerFormNuevoUsuario);
router.get("/empresa/form-nuevo", obtenerFormNuevaEmpresa);
router.post("/empresa", crearEmpresa);
router.post("/piso", crearPiso);
router.post("/acceso", crearAcceso);
router.post("/usuario", crearUsuario);
router.post("/configuracion", crearConfiguracion);
router.delete("/piso/:id", eliminarPiso);
router.delete("/acceso/:id", eliminarAcceso);

export default router;