"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileController_1 = require("../controllers/file/fileController"); // Importar funciones de controlador
const upload_1 = __importDefault(require("../config/upload"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post("/upload", authMiddleware_1.verifyToken, upload_1.default.single("file"), fileController_1.uploadFile);
router.get("/", authMiddleware_1.verifyToken, fileController_1.getFiles);
router.delete("/:id", authMiddleware_1.verifyToken, fileController_1.deleteFile);
exports.default = router;
