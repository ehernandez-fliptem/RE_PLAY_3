import { Router } from "express";
import { crear, modificar, eliminar } from "../controllers/citas.controller";
import { validarToken } from "../middlewares/validarToken";

const router = Router();

router.post('/', validarToken, crear);
router.put('/eliminar', validarToken, eliminar);
router.put('/', validarToken, modificar);

export default router;