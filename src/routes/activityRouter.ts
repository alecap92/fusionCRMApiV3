import { Router } from "express";
import {
  createActivity,
  getActivities,
  updateActivity,
  deleteActivity,
  getActivity,
} from "../controllers/activities/activitiesController";

const router: Router = Router();

router.put("/:id", updateActivity);
router.post("/", createActivity);
router.get("/:contactId", getActivities);
router.get("/activity/:id", getActivity);
router.delete("/:id", deleteActivity);

export default router;
