import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { crearGrupoBiostar, listarGruposBiostar } from "../controllers/biostarGrupos.controller";

const router = Router();

router.get("/", validarTokenYRol([1], true), listarGruposBiostar);
router.post("/", validarTokenYRol([1], true), crearGrupoBiostar);

export default router;
