import express from "express";
import {
  uploadFile,
  getFiles,
  deleteFile,
} from "../controllers/file/fileController"; // Importar funciones de controlador
import upload from "../config/upload";
import { verifyToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/upload", verifyToken, upload.single("file"), uploadFile);
router.get("/", verifyToken, getFiles);
router.delete("/:id", verifyToken, deleteFile);

export default router;
