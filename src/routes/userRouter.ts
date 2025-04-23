import { Router } from "express";
import {
  getUserById,
  createUser,
  getUsers,
  updateUser,
  updateUserPassword,
} from "../controllers/users/userController";

const router: Router = Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/", updateUser);
router.put("/update-password", updateUserPassword);

export default router;
