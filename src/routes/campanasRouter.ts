import { Router } from "express";
import {
  getCampanas,
  getCampana,
  createCampana,
  updateCampana,
  deleteCampana,
} from "../controllers/campanas/campanasController";

const router: Router = Router();

router.get("/", getCampanas);
router.get("/:id", getCampana);
router.post("/", createCampana);
router.put("/:id", updateCampana);
router.delete("/:id", deleteCampana);

export default router;
