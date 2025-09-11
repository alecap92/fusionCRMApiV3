import { Router } from "express";
import { verifyToken } from "../../middlewares/authMiddleware";
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  renewApiToken,
  getApiPermissions,
} from "../../controllers/api/apiTokenController";

const router: Router = Router();

// Todas las rutas requieren autenticación con token de usuario (no API)
router.use(verifyToken);

// Obtener permisos disponibles
router.get("/permissions", getApiPermissions);

// Listar tokens de API del usuario
router.get("/", listApiTokens);

// Crear nuevo token de API
router.post("/", createApiToken);

// Revocar token de API
router.delete("/:tokenId", revokeApiToken);

// Renovar token de API
router.put("/:tokenId/renew", renewApiToken);

export default router;
