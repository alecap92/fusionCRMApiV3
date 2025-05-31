import { Router } from "express";
import {
  getOrganization,
  updateOrganization,
  getOrganizationById,
  uploadLogo,
  uploadIcon,
} from "../controllers/organizations/organizationController";
import multer from "multer";

const router: Router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", getOrganization);
router.get("/:id", getOrganizationById);
router.put("/", updateOrganization);
router.post("/upload-logo", upload.single("logo"), uploadLogo);
router.post("/upload-icon", upload.single("icon"), uploadIcon);

export default router;
