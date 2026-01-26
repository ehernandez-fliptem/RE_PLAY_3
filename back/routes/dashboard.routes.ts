import { Router } from "express";
import { validarTokenYRol } from "../middlewares/validarToken";
import { obtenerDashboard } from "../controllers/dashboard.controller";

const router = Router();

router.get("/", validarTokenYRol([4]), obtenerDashboard);

export default router;