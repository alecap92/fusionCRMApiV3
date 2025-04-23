import { Router } from "express";
import {
  getSocialAccounts,
  getSocialAccount,
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
  callbackSocialAccount,
  getMe,
  getInstagramAccounts,
} from "../controllers/social/socialAccountController";

const router: Router = Router();

// Obtener todas las cuentas conectadas
router.get("/", getSocialAccounts);

router.get("/me", getMe);

router.get("/instagram", getInstagramAccounts);

// Callback
router.get("/callback", callbackSocialAccount);

// Obtener una cuenta específica
router.get("/:id", getSocialAccount);

// Conectar o registrar una nueva cuenta
router.post("/", createSocialAccount);

// Actualizar datos de una cuenta
router.patch("/:id", updateSocialAccount);

// Eliminar una cuenta social
router.delete("/:id", deleteSocialAccount);

export default router;
