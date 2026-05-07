import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  crearPuerta,
  crearGrupoDispositivo,
  editarPuerta,
  editarGrupoDispositivo,
  eliminarPuerta,
  eliminarGrupoDispositivo,
  listarGruposDispositivos,
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

export default router;
