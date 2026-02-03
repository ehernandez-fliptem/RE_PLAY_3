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

router.get("/", validarTokenYRol([1]), obtenerTodos);
router.get("/form-nuevo", validarTokenYRol([1]), obtenerFormNuevoDispositivosHV);
router.get("/demonio", validarTokenYRol([1]), obtenerTodosDemonio);
router.get("/:id", validarTokenYRol([1]), obtenerUno);
router.get("/form-editar/:id", validarTokenYRol([1]), obtenerUnoFormEditar);
router.get("/sincronizar/:id", validarTokenYRol([1]), sincronizarPanel);
router.get("/sincronizar-visitante/:panelId/:visitanteId", validarTokenYRol([1]), sincronizarVisitanteEnPanel);
router.post("/", validarTokenYRol([1]), crear);
router.post("/probar-conexion", validarTokenYRol([1]), probarConexion);
router.post("/probar-conexion/:id", validarTokenYRol([1]), probarConexion);
router.put("/:id", validarTokenYRol([1]), modificar);
router.patch("/:id", validarTokenYRol([1]), modificarEstado);

export default router;
