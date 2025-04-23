import { Router } from "express";
import {
  getOrganization,
  updateOrganization,
  getOrganizationById,
  uploadLogo,
} from "../controllers/organizations/organizationController";
import multer from "multer";

const router: Router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", getOrganization);
router.get("/:id", getOrganizationById);
router.put("/", updateOrganization);
router.post("/uploadLogo", upload.single("logo"), uploadLogo);

export default router;
