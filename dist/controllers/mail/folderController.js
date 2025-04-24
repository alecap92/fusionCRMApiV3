"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFolder = exports.updateFolder = exports.createFolder = exports.getFolders = void 0;
const imap_simple_1 = __importDefault(require("imap-simple"));
const UserModel_1 = __importDefault(require("../../models/UserModel"));
// import { IFolders } from "../../types";
/**
 * Lista las carpetas disponibles para el usuario.
 */
const getFolders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_b = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _b === void 0 ? void 0 : _b.imapSettings)) {
            return res
                .status(404)
                .json({ error: "IMAP settings not found for user." });
        }
        const connection = yield imap_simple_1.default.connect({
            imap: user.emailSettings.imapSettings,
        });
        const boxes = yield connection.getBoxes();
        const folders = Object.keys(boxes); // Extraer nombres de carpetas
        res.status(200).json({ folders });
    }
    catch (error) {
        console.error("Error fetching folders:", error);
        res.status(500).json({ error: "Failed to fetch folders." });
    }
});
exports.getFolders = getFolders;
/**
 * Crea una nueva carpeta personalizada para el usuario.
 */
const createFolder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { folderName } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!folderName) {
            return res.status(400).json({ error: "Folder name is required." });
        }
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_b = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _b === void 0 ? void 0 : _b.imapSettings)) {
            return res
                .status(404)
                .json({ error: "IMAP settings not found for user." });
        }
        const connection = yield imap_simple_1.default.connect({
            imap: user.emailSettings.imapSettings,
        });
        yield connection.addBox(folderName);
        res
            .status(201)
            .json({ message: `Folder '${folderName}' created successfully.` });
    }
    catch (error) {
        console.error("Error creating folder:", error);
        res.status(500).json({ error: "Failed to create folder." });
    }
});
exports.createFolder = createFolder;
/**
 * Renombra una carpeta existente.
 */
const updateFolder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { oldName, newName } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!oldName || !newName) {
            return res
                .status(400)
                .json({ error: "Both oldName and newName are required." });
        }
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_b = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _b === void 0 ? void 0 : _b.imapSettings)) {
            return res
                .status(404)
                .json({ error: "IMAP settings not found for user." });
        }
        const connection = yield imap_simple_1.default.connect({
            imap: user.emailSettings.imapSettings,
        });
        // await connection.renameBox(oldName, newName);
        res.status(200).json({
            message: `Folder '${oldName}' renamed to '${newName}' successfully.`,
        });
    }
    catch (error) {
        console.error("Error renaming folder:", error);
        res.status(500).json({ error: "Failed to rename folder." });
    }
});
exports.updateFolder = updateFolder;
/**
 * Elimina una carpeta existente.
 */
const deleteFolder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { folderName } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!folderName) {
            return res.status(400).json({ error: "Folder name is required." });
        }
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_b = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _b === void 0 ? void 0 : _b.imapSettings)) {
            return res
                .status(404)
                .json({ error: "IMAP settings not found for user." });
        }
        const connection = yield imap_simple_1.default.connect({
            imap: user.emailSettings.imapSettings,
        });
        yield connection.delBox(folderName);
        res
            .status(200)
            .json({ message: `Folder '${folderName}' deleted successfully.` });
    }
    catch (error) {
        console.error("Error deleting folder:", error);
        res.status(500).json({ error: "Failed to delete folder." });
    }
});
exports.deleteFolder = deleteFolder;
