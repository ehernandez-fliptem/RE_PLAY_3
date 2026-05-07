import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { listarGruposDispositivos, listarPuertas } from "../controllers/biostarCatalogos.controller";

const router = Router();

router.get("/grupos-dispositivos", validarTokenYRol([1], true), listarGruposDispositivos);
router.get("/puertas", validarTokenYRol([1], true), listarPuertas);

export default router;
