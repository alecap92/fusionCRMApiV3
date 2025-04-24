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
exports.generateContent = exports.checkAndPostScheduledPosts = exports.retryScheduledPost = exports.deleteScheduledPost = exports.updateScheduledPost = exports.createScheduledPost = exports.getScheduledPost = exports.getScheduledPosts = void 0;
const ScheduledPost_1 = __importDefault(require("../../models/ScheduledPost"));
const SocialAccount_1 = __importDefault(require("../../models/SocialAccount"));
const aws_1 = require("../../config/aws");
const instagramService_1 = require("../../services/instagramService");
const facebookService_1 = require("../../services/facebookService");
const openAiService_1 = require("../../services/openAiService");
const getScheduledPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationId } = req.query;
        const filter = organizationId ? { organizationId } : {};
        const posts = yield ScheduledPost_1.default.find(filter).sort({ scheduledFor: 1 });
        res.status(200).json(posts);
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Error al obtener publicaciones", error: err });
    }
});
exports.getScheduledPosts = getScheduledPosts;
const getScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield ScheduledPost_1.default.findById(req.params.id);
        if (!post)
            return res.status(404).json({ message: "Publicación no encontrada" });
        res.status(200).json(post);
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Error al obtener la publicación", error: err });
    }
});
exports.getScheduledPost = getScheduledPost;
const createScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // obtener el body del request y el organizationId del usuario
        const body = req.body;
        const organizationId = "659d89b73c6aa865f1e7d6fb";
        const socialAccount = yield SocialAccount_1.default.findOne({
            organizationId,
            platform: "facebook",
        });
        if (!socialAccount) {
            return res
                .status(404)
                .json({ message: "No se encontró la cuenta social" });
        }
        // Subir la imagen al S3 y obtener el url
        const buffer = (_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer;
        const type = (_b = req.file) === null || _b === void 0 ? void 0 : _b.mimetype;
        if (!buffer || !type) {
            return res.status(400).json({ message: "No se encontró la imagen" });
        }
        // Subir el archivo a S3
        const imageUrl = yield (0, aws_1.subirArchivo)(buffer, Date.now().toString(), type);
        // formatear el post
        const post = {
            content: body.content,
            socialAccountId: socialAccount._id,
            mediaUrls: [imageUrl],
            scheduledFor: body.scheduledFor,
            status: "scheduled",
            facebookAccountId: body.facebookAccountId,
            instagramAccountId: body.instagramAccountId,
            platforms: body.platforms,
            organizationId,
        };
        const newPost = new ScheduledPost_1.default(post);
        const saved = yield newPost.save();
        res.status(201).json(saved);
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Error al crear la publicación", error: err });
    }
});
exports.createScheduledPost = createScheduledPost;
const updateScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield ScheduledPost_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ message: "Publicación no encontrada" });
        res.status(200).json(updated);
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Error al actualizar la publicación", error: err });
    }
});
exports.updateScheduledPost = updateScheduledPost;
const deleteScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield ScheduledPost_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ message: "Publicación no encontrada" });
        res.status(200).json({ message: "Publicación eliminada" });
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Error al eliminar la publicación", error: err });
    }
});
exports.deleteScheduledPost = deleteScheduledPost;
const retryScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield ScheduledPost_1.default.findById(req.params.id);
        if (!post)
            return res.status(404).json({ message: "Publicación no encontrada" });
        if (post.status !== "failed") {
            return res
                .status(400)
                .json({ message: "Solo se pueden reintentar publicaciones fallidas" });
        }
        post.status = "scheduled";
        post.errorMessage = undefined;
        yield post.save();
        res.status(200).json({ message: "Publicación reprogramada" });
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Error al reintentar publicación", error: err });
    }
});
exports.retryScheduledPost = retryScheduledPost;
const checkAndPostScheduledPosts = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const posts = yield ScheduledPost_1.default.find({
            status: "scheduled",
            scheduledFor: { $lte: now },
        });
        for (const post of posts) {
            try {
                let hasError = false;
                let errorMessages = [];
                // Handle both Facebook and Instagram if platforms include both
                if (post.platforms.includes("facebook")) {
                    try {
                        yield (0, facebookService_1.postToFacebook)(post);
                    }
                    catch (error) {
                        hasError = true;
                        errorMessages.push(`Facebook: ${error.message}`);
                    }
                }
                if (post.platforms.includes("instagram")) {
                    try {
                        yield (0, instagramService_1.postToInstagram)(post);
                    }
                    catch (error) {
                        hasError = true;
                        errorMessages.push(`Instagram: ${error.message}`);
                    }
                }
                if (!post.platforms.length) {
                    hasError = true;
                    errorMessages.push("No hay cuentas de Facebook o Instagram asociadas");
                }
                post.status = hasError ? "failed" : "published";
                post.errorMessage = errorMessages.join("; ") || "";
            }
            catch (error) {
                console.error(`[ERROR] Falló la publicación del post ${post._id}:`, error.message);
                post.status = "failed";
                post.errorMessage = error.message;
            }
            yield post.save();
        }
    }
    catch (err) {
        console.error("[ERROR] Revisión de posts fallida:", err);
    }
});
exports.checkAndPostScheduledPosts = checkAndPostScheduledPosts;
const generateContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(400)
                .json({ message: "ID de organización no proporcionado" });
        }
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: "Prompt no proporcionado" });
        }
        const content = yield openAiService_1.openAIService.generateSocialContent(prompt, organizationId);
        res.status(200).json({
            content,
            message: "Contenido generado exitosamente",
        });
    }
    catch (err) {
        res.status(500).json({ message: "Error al generar contenido", error: err });
    }
});
exports.generateContent = generateContent;
