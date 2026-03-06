import { Router } from "express";
import { validarTokenYRol } from '../middlewares/validarToken';
import { obtenerTodos, obtenerUno, crear, modificarEstado, modificar, obtenerFormNuevoPase, obtenerFormEditarPase, obtenerTodosActivos, } from '../controllers/pases.controller';

const router = Router();

router.get('/', validarTokenYRol([1, 2]), obtenerTodos);
router.get('/activos', validarTokenYRol([1, 2]), obtenerTodosActivos);
router.get("/form-nuevo", validarTokenYRol([1, 2]), obtenerFormNuevoPase);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarPase);
router.get('/:id', validarTokenYRol([1, 2]), obtenerUno);
router.post('/', validarTokenYRol([1, 2]), crear);
router.put('/:id', validarTokenYRol([1, 2]), modificar);
router.patch('/:id', validarTokenYRol([1, 2]), modificarEstado);

export default router;
