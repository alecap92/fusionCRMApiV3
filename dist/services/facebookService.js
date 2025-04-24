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
exports.postToFacebook = void 0;
const axios_1 = __importDefault(require("axios"));
const SocialAccount_1 = __importDefault(require("../models/SocialAccount"));
/**
 * Publicar en Facebook
 * @description Este controlador publica una imagen o un texto en Facebook usando la Graph API.
 * Se requiere el access token de la cuenta conectada y el ID de la página de Facebook.
 * Debe enviarse en el body el caption y opcionalmente la URL de la imagen.
 * El accessToken se obtiene desde la base de datos, asociado a la organización.
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<void>} - Una promesa que resuelve cuando se completa la publicación.
 *
 * Endpoint base:
 * - Para publicar imagen: POST /v22.0/{page_id}/photos
 * - Para texto: POST /v22.0/{page_id}/feed
 * - Para videos: POST /v22.0/{page_id}/videos (no implementado aquí)
 */
const postToFacebook = (post) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const account = yield SocialAccount_1.default.findOne({
            organizationId: post.organizationId,
            platform: "facebook",
        });
        if (!account) {
            console.log("No se encontró la cuenta en la base de datos");
            return;
        }
        // 1. Obtener el access token desde /me
        const meapi = yield axios_1.default.get(`https://graph.facebook.com/v22.0/me/accounts?access_token=${account.accessToken}`);
        const pageAccessToken = meapi.data.data.find((page) => page.id === post.facebookAccountId);
        const accessToken = pageAccessToken.access_token;
        // 2. Obtener parámetros necesarios
        const pageId = post.facebookAccountId;
        const caption = post.content;
        const imageUrl = post.mediaUrls[0];
        if (!caption) {
            console.log("No se encontró el caption");
            return;
        }
        if (!pageId) {
            console.log("No se encontró el ID de la página");
            return;
        }
        if (!imageUrl) {
            console.log("No se encontró la URL de la imagen");
            return;
        }
        // 3. Determinar endpoint y payload
        let endpoint = "";
        const payload = {
            access_token: accessToken,
        };
        if (imageUrl) {
            endpoint = `https://graph.facebook.com/v22.0/${pageId}/photos`;
            payload.url = imageUrl;
            payload.caption = caption;
        }
        else {
            endpoint = `https://graph.facebook.com/v22.0/${pageId}/feed`;
            payload.message = caption;
        }
        // 4. Realizar publicación
        const { data } = yield axios_1.default.post(endpoint, payload);
    }
    catch (error) {
        console.error("Error al publicar en Facebook:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return;
    }
});
exports.postToFacebook = postToFacebook;
