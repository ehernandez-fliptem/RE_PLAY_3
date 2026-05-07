import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  obtenerTodos,
  obtenerUno,
  obtenerUnoFormEditar,
  obtenerConexionGlobal,
  guardarConexionGlobal,
  probarConexionGlobal,
  sincronizarDispositivos,
  crear,
  modificar,
  modificarEstado,
  establecerMain,
  eliminar,
  probarConexion,
  listarDispositivosRemotos,
  buscarDispositivoRemoto,
  crearDispositivoRemoto,
  editarDispositivoRemoto,
  eliminarDispositivoRemoto,
} from "../controllers/dispositivosBiostar.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), obtenerTodos);
router.get("/conexion-global", validarTokenYRol([1], true), obtenerConexionGlobal);
router.get("/form-editar/:id", validarTokenYRol([1], true), obtenerUnoFormEditar);
router.get("/:id", validarTokenYRol([1], true), obtenerUno);
router.put("/conexion-global", validarTokenYRol([1], true), guardarConexionGlobal);
router.post("/conexion-global/probar", validarTokenYRol([1], true), probarConexionGlobal);
router.post("/sincronizar-dispositivos", validarTokenYRol([1], true), sincronizarDispositivos);
router.post("/", validarTokenYRol([1], true), crear);
router.post("/probar-conexion", validarTokenYRol([1], true), probarConexion);
router.post("/probar-conexion/:id", validarTokenYRol([1], true), probarConexion);
router.get("/remotos", validarTokenYRol([1], true), listarDispositivosRemotos);
router.post("/remotos/buscar", validarTokenYRol([1], true), buscarDispositivoRemoto);
router.post("/remotos", validarTokenYRol([1], true), crearDispositivoRemoto);
router.put("/remotos/:id", validarTokenYRol([1], true), editarDispositivoRemoto);
router.delete("/remotos/:id", validarTokenYRol([1], true), eliminarDispositivoRemoto);
router.put("/:id", validarTokenYRol([1], true), modificar);
router.patch("/:id", validarTokenYRol([1], true), modificarEstado);
router.patch("/:id/main", validarTokenYRol([1], true), establecerMain);
router.delete("/:id", validarTokenYRol([1], true), eliminar);

export default router;
