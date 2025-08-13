import { Router } from "express";
import {
  getNotifications,
  resetNotifications,
  sendTestPush,
} from "../controllers/notifications/notificationController";

const router: Router = Router();

console.log("notificationRouter");

router.post("/test-push", sendTestPush);
router.get("/", getNotifications);
router.post("/reset", resetNotifications);

export default router;
