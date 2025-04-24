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
exports.publishScheduledPost = void 0;
// services/publisherService.ts
const axios_1 = __importDefault(require("axios"));
const ScheduledPost_1 = __importDefault(require("../models/ScheduledPost"));
const SocialAccount_1 = __importDefault(require("../models/SocialAccount"));
const publishScheduledPost = (postId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield ScheduledPost_1.default.findById(postId);
        if (!post)
            return { success: false, message: "Publicación no encontrada" };
        const account = yield SocialAccount_1.default.findById(post.socialAccountId);
        if (!account)
            return { success: false, message: "Cuenta social no encontrada" };
        let result;
        switch (account.platform) {
            case "facebook":
                result = yield publishToFacebook(post, account);
                break;
            case "instagram":
                result = yield publishToInstagram(post, account);
                break;
            default:
                result = { success: false, message: "Plataforma no soportada" };
        }
        post.status = result.success ? "published" : "failed";
        post.errorMessage = result.success ? undefined : result.message;
        yield post.save();
        return result;
    }
    catch (err) {
        console.error("❌ Error publicando post:", err);
        yield ScheduledPost_1.default.findByIdAndUpdate(postId, {
            status: "failed",
            errorMessage: err.message,
        });
        return { success: false, message: "Error al publicar" };
    }
});
exports.publishScheduledPost = publishScheduledPost;
const publishToFacebook = (post, account) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const url = (_a = post.mediaUrls) === null || _a === void 0 ? void 0 : _a[0];
        const endpoint = url
            ? `https://graph.facebook.com/${account.accountId}/photos`
            : `https://graph.facebook.com/${account.accountId}/feed`;
        const payload = {
            access_token: account.accessToken,
        };
        if (url) {
            payload.url = url;
            payload.message = post.content;
        }
        else {
            payload.message = post.content;
        }
        yield axios_1.default.post(endpoint, payload);
        return { success: true, message: "Publicado en Facebook" };
    }
    catch (err) {
        console.error("❌ Error al publicar en Facebook:", err);
        return {
            success: false,
            message: ((_d = (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || "Error desconocido",
        };
    }
});
const publishToInstagram = (post, account) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const mediaUrl = (_a = post.mediaUrls) === null || _a === void 0 ? void 0 : _a[0];
        if (!mediaUrl)
            return {
                success: false,
                message: "Instagram requiere una imagen o video",
            };
        // Paso 1: Crear contenedor de medios
        const mediaResponse = yield axios_1.default.post(`https://graph.facebook.com/v19.0/${account.accountId}/media`, {
            image_url: mediaUrl,
            caption: post.content,
            access_token: account.accessToken,
        });
        const creationId = mediaResponse.data.id;
        if (!creationId)
            return { success: false, message: "Error creando contenedor de medios" };
        // Paso 2: Publicar el contenedor
        yield axios_1.default.post(`https://graph.facebook.com/v19.0/${account.accountId}/media_publish`, {
            creation_id: creationId,
            access_token: account.accessToken,
        });
        return { success: true, message: "Publicado en Instagram" };
    }
    catch (err) {
        console.error("❌ Error al publicar en Instagram:", err);
        return {
            success: false,
            message: ((_d = (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || "Error desconocido",
        };
    }
});
