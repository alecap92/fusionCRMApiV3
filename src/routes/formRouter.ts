import { Router } from "express";
import {
  createForm,
  submitFormResponse,
  getForms,
  deleteForm,
  getForm,
  deleteFormResponses,
} from "../controllers/forms/formController";
import multer from "multer";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();
const upload = multer();

router.get("/", verifyToken, getForms);
router.get("/:formId", verifyToken, getForm);
router.post("/create", verifyToken, createForm);
router.post("/submit/:formId", upload.none(), submitFormResponse);
router.delete("/form-responses", verifyToken, deleteFormResponses);
router.delete("/:formId", verifyToken, deleteForm);

export default router;
