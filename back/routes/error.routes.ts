import { Router } from "express";
import { notificarError } from "../controllers/error.controller";

const router = Router();

router.post("/notificar", notificarError);

export default router;
