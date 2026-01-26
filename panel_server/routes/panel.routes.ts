import { Router } from "express";
import{ probarConexion, obtenerEventos, obtenerImagenEvento, obtenerTokenValue } from "../controllers/panel.controller";
import { validarToken } from "../middlewares/validarToken";

const router = Router();


router.post('/', validarToken, probarConexion);
router.post('/seguridad', validarToken, obtenerTokenValue);
router.post('/eventos', obtenerEventos);
router.post('/eventos/imagen', obtenerImagenEvento);

export default router;