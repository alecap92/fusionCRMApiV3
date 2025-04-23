import { Router } from "express";
import {
  getNotifications,
  resetNotifications,
} from "../controllers/notifications/notificationController";

const router: Router = Router();

router.get("/", getNotifications);
router.post("/reset", resetNotifications);

export default router;
