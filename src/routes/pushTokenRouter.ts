import { Router } from "express";
import {
    createPushToken, deletePushToken
} from "../controllers/pushTokenController";

const router: Router = Router();

router.post("/", createPushToken);
router.delete("/", deletePushToken);

export default router;
