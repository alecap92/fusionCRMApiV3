import { Router } from "express";
import {
  login,
  refreshToken,
  register,
  verifyToken as verifyT,
} from "../controllers/auth/authController";
import { verifyToken } from "../middlewares/authMiddleware";

const router: Router = Router();

// Endpoint para iniciar sesión
router.post("/login", login);
router.post("/register", register);
router.post("/verify-token", verifyToken, verifyT);
router.post("/refresh", verifyToken, refreshToken); // Añadir este endpoint

export default router;
