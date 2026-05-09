import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  crearPuerta,
  crearPuertaAcceso,
  crearGrupoDispositivo,
  editarPuerta,
  editarPuertaAcceso,
  editarGrupoDispositivo,
  eliminarPuerta,
  eliminarPuertaAcceso,
  eliminarGrupoDispositivo,
  listarCatalogosPuertasAcceso,
  listarGruposDispositivos,
  listarPuertasAcceso,
  listarPuertas,
} from "../controllers/biostarCatalogos.controller";

const router = Router();

router.get("/grupos-dispositivos", validarTokenYRol([1], true), listarGruposDispositivos);
router.post("/grupos-dispositivos", validarTokenYRol([1], true), crearGrupoDispositivo);
router.put("/grupos-dispositivos/:id", validarTokenYRol([1], true), editarGrupoDispositivo);
router.delete("/grupos-dispositivos/:id", validarTokenYRol([1], true), eliminarGrupoDispositivo);
router.get("/puertas", validarTokenYRol([1], true), listarPuertas);
router.post("/puertas", validarTokenYRol([1], true), crearPuerta);
router.put("/puertas/:id", validarTokenYRol([1], true), editarPuerta);
router.delete("/puertas/:id", validarTokenYRol([1], true), eliminarPuerta);
router.get("/puertas-acceso", validarTokenYRol([1], true), listarPuertasAcceso);
router.get("/puertas-acceso/catalogos", validarTokenYRol([1], true), listarCatalogosPuertasAcceso);
router.post("/puertas-acceso", validarTokenYRol([1], true), crearPuertaAcceso);
router.put("/puertas-acceso/:id", validarTokenYRol([1], true), editarPuertaAcceso);
router.delete("/puertas-acceso/:id", validarTokenYRol([1], true), eliminarPuertaAcceso);

export default router;
