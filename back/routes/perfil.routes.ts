import { Router } from "express";
import { obtenerUno, redirijirUserVisit } from "../controllers/perfil.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.get("/", validarTokenYRol([1, 2, 4, 5, 10, 11, 12]), obtenerUno);
router.put("/", validarTokenYRol([1, 2, 4, 5, 10, 11, 12]), redirijirUserVisit);

export default router;
