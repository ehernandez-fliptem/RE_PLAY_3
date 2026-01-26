import { Router } from "express";
import { crear, modificar, desactivar } from "../controllers/usuarios.controller";
import { validarToken } from "../middlewares/validarToken";

const router = Router();

router.post('/', validarToken, crear);
router.put('/desactivar', validarToken, desactivar);
router.put('/', validarToken, modificar);

export default router;