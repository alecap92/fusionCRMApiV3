import { Router } from "express";
import multer from "multer";

import { importContacts } from "../controllers/import/importController";
import { importDeals } from "../controllers/import/importDeals";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

router.post("/contacts", upload.single("file"), importContacts);
router.post("/deals", upload.single("file"), importDeals);

export default router;
