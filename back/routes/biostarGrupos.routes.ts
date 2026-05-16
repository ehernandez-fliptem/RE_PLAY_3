import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import {
  crearGrupoBiostar,
  editarGrupoBiostar,
  eliminarGrupoBiostar,
  listarGruposBiostar,
} from "../controllers/biostarGrupos.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), listarGruposBiostar);
router.post("/", validarTokenYRol([1], true), crearGrupoBiostar);
router.put("/:id", validarTokenYRol([1], true), editarGrupoBiostar);
router.delete("/:id", validarTokenYRol([1], true), eliminarGrupoBiostar);

export default router;
