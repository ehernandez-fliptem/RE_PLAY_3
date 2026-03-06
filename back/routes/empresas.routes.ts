import { Router } from "express";
import { validarTokenYRol } from '../middlewares/validarToken';
import { modificarEmpValidador } from '../validators/validador.empresa';
import { obtenerTodos, obtenerTodosActivos, obtenerUno, crear, modificar, modificarEstado, obtenerFormNuevoEmpresa, obtenerFormEditarEmpresa } from '../controllers/empresas.controller';

const router = Router();

router.get('/', validarTokenYRol([1, 2]), obtenerTodos);
router.get('/activos', validarTokenYRol([1, 2]), obtenerTodosActivos);
router.get("/form-nuevo", validarTokenYRol([1, 2]), obtenerFormNuevoEmpresa);
router.get("/form-editar/:id", validarTokenYRol([1, 2]), obtenerFormEditarEmpresa);
router.get('/:id', validarTokenYRol([1, 2]), obtenerUno);
router.put('/:id', validarTokenYRol([1, 2]), modificarEmpValidador, modificar);
router.post('/', validarTokenYRol([1, 2]), crear);
router.patch('/:id', validarTokenYRol([1, 2]), modificarEstado);

export default router;
