import { Router } from "express";
import {
  getNotifications,
  resetNotifications,
  sendTestPush,
} from "../controllers/notifications/notificationController";

const router: Router = Router();

router.get("/", getNotifications);
router.post("/reset", resetNotifications);
router.post("/test-push", sendTestPush);

export default router;
