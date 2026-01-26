import { Router } from "express";
import { login, logout } from "../controllers/auth.controller";

const router = Router();

router.post("/", login);
router.post("/logout", logout);

export default router;
