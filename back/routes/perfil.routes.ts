import { Router } from "express";
import { obtenerUno, redirijirUserVisit } from "../controllers/perfil.controller";
import { validarTokenYRol } from "../middlewares/validarToken";

const router = Router();

router.get("/", validarTokenYRol([1, 2, 4, 5, 6, 7, 10]), obtenerUno);
router.put("/", validarTokenYRol([1, 2, 4, 5, 6, 7, 10]), redirijirUserVisit);

export default router;