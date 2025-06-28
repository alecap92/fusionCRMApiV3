import { Router } from "express";
import {
  login,
  refreshToken,
  register,
  verifyToken as verifyT,
  firebaseLogin,
  firebaseRegister,
  logoutAllDevices,
} from "../controllers/auth/authController";
import { verifyToken } from "../middlewares/authMiddleware";

const router: Router = Router();

// Endpoint para iniciar sesión
router.post("/login", login);
router.post("/register", register);
router.post("/verify-token", verifyToken, verifyT);
router.post("/refresh", verifyToken, refreshToken);
router.post("/logout-all", verifyToken, logoutAllDevices);

// Endpoints para autenticación con Firebase (separados)
router.post("/firebase-login", firebaseLogin);
router.post("/firebase-register", firebaseRegister);

export default router;
