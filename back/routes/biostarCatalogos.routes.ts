import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  catalogosAccessLevel,
  crearAccessLevel,
  crearHorarioAccessLevel,
  crearHorarioBiostar,
  editarHorarioBiostar,
  crearPuerta,
  crearPuertaAcceso,
  detalleAccessLevel,
  detalleHorarioBiostar,
  detallePuertaAcceso,
  crearGrupoDispositivo,
  editarAccessLevel,
  editarPuerta,
  editarPuertaAcceso,
  editarGrupoDispositivo,
  eliminarPuerta,
  eliminarPuertaAcceso,
  eliminarHorarioBiostar,
  eliminarGrupoDispositivo,
  listarHorariosBiostar,
  listarCatalogosPuertasAcceso,
  listarAccessLevels,
  listarOpcionesAltaPuertaAcceso,
  listarOpcionesDispositivoPuertaAcceso,
  listarGruposDispositivos,
  listarPuertasAcceso,
  listarPuertas,
} from "../controllers/biostarCatalogos.controller";

const router = Router();

router.get("/grupos-dispositivos", validarTokenYRol([1], true), listarGruposDispositivos);
router.post("/grupos-dispositivos", validarTokenYRol([1], true), crearGrupoDispositivo);
router.put("/grupos-dispositivos/:id", validarTokenYRol([1], true), editarGrupoDispositivo);
router.delete("/grupos-dispositivos/:id", validarTokenYRol([1], true), eliminarGrupoDispositivo);
router.get("/access-levels", validarTokenYRol([1], true), listarAccessLevels);
router.get("/access-levels/catalogos", validarTokenYRol([1], true), catalogosAccessLevel);
router.post("/access-levels/horarios", validarTokenYRol([1], true), crearHorarioAccessLevel);
router.get("/access-levels/:id", validarTokenYRol([1], true), detalleAccessLevel);
router.post("/access-levels", validarTokenYRol([1], true), crearAccessLevel);
router.put("/access-levels/:id", validarTokenYRol([1], true), editarAccessLevel);
router.get("/horarios", validarTokenYRol([1], true), listarHorariosBiostar);
router.get("/horarios/:id", validarTokenYRol([1], true), detalleHorarioBiostar);
router.post("/horarios", validarTokenYRol([1], true), crearHorarioBiostar);
router.put("/horarios/:id", validarTokenYRol([1], true), editarHorarioBiostar);
router.delete("/horarios/:id", validarTokenYRol([1], true), eliminarHorarioBiostar);
router.get("/puertas", validarTokenYRol([1], true), listarPuertas);
router.post("/puertas", validarTokenYRol([1], true), crearPuerta);
router.put("/puertas/:id", validarTokenYRol([1], true), editarPuerta);
router.delete("/puertas/:id", validarTokenYRol([1], true), eliminarPuerta);
router.get("/puertas-acceso", validarTokenYRol([1], true), listarPuertasAcceso);
router.get("/puertas-acceso/catalogos", validarTokenYRol([1], true), listarCatalogosPuertasAcceso);
router.get("/puertas-acceso/opciones-alta", validarTokenYRol([1], true), listarOpcionesAltaPuertaAcceso);
router.get("/puertas-acceso/opciones-dispositivo", validarTokenYRol([1], true), listarOpcionesDispositivoPuertaAcceso);
router.get("/puertas-acceso/:id", validarTokenYRol([1], true), detallePuertaAcceso);
router.post("/puertas-acceso", validarTokenYRol([1], true), crearPuertaAcceso);
router.put("/puertas-acceso/:id", validarTokenYRol([1], true), editarPuertaAcceso);
router.delete("/puertas-acceso/:id", validarTokenYRol([1], true), eliminarPuertaAcceso);

export default router;
