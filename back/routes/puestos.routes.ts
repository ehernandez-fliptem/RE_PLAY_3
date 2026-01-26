import { Router } from "express";
import { validarTokenYRol } from '../middlewares/validarToken';
import { obtenerTodos, obtenerTodosActivos, obtenerUno, crear, modificar, modificarEstado } from '../controllers/puestos.controller';

const router = Router();

router.get('/', validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerTodos);
router.get('/activos', validarTokenYRol([1, 2, 4, 5, 6, 7]), obtenerTodosActivos);
router.get('/:id', validarTokenYRol([1], true), obtenerUno);
router.put('/:id', validarTokenYRol([1], true), modificar);
router.post('/', validarTokenYRol([1], true), crear);
router.patch('/:id', validarTokenYRol([1], true), modificarEstado);

export default router;