import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
    obtenerTodos,
    obtenerUno,
    crear,
    modificar,
    modificarEstado,
    probarConexion,
    sincronizarPanel,
    sincronizarVisitanteEnPanel,
    obtenerUnoFormEditar,
    obtenerTodosDemonio,
    obtenerFormNuevoDispositivosHV,
} from "../controllers/dispositivosHv.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), obtenerTodos);
router.get("/form-nuevo", validarTokenYRol([1], true), obtenerFormNuevoDispositivosHV);
router.get("/demonio", validarTokenYRol([1], true), obtenerTodosDemonio);
router.get("/:id", validarTokenYRol([1], true), obtenerUno);
router.get("/form-editar/:id", validarTokenYRol([1], true), obtenerUnoFormEditar);
router.get("/sincronizar/:id", validarTokenYRol([1], true), sincronizarPanel);
router.get("/sincronizar-visitante/:panelId/:visitanteId", validarTokenYRol([1], true), sincronizarVisitanteEnPanel);
router.post("/", validarTokenYRol([1], true), crear);
router.post("/probar-conexion", validarTokenYRol([1], true), probarConexion);
router.post("/probar-conexion/:id", validarTokenYRol([1], true), probarConexion);
router.put("/:id", validarTokenYRol([1], true), modificar);
router.patch("/:id", validarTokenYRol([1], true), modificarEstado);

export default router;
