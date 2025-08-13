import { Router } from "express";
import {
  getNotifications,
  resetNotifications,
  sendTestPush,
} from "../controllers/notifications/notificationController";

const router: Router = Router();

router.post("/test-push", sendTestPush);
router.get("/", getNotifications);
router.post("/reset", resetNotifications);

export default router;
