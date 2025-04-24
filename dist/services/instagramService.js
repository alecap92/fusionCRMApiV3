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
exports.postToInstagram = void 0;
const axios_1 = __importDefault(require("axios"));
const SocialAccount_1 = __importDefault(require("../models/SocialAccount"));
/**
 * Publicar en Instagram
 * @description Este controlador publica una imagen y un caption en Instagram.
 * Se requiere el access token de la cuenta de Instagram y el ID de la cuenta.
 * La imagen se sube a un contenedor y luego se publica.
 * Debe enviarsele en el body el caption y la url de la imagen. y en los params el id de la cuenta de instagram.
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<void>} - Una promesa que resuelve cuando se completa la publicación.
 **/
const postToInstagram = (post) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Obtener el access token
    const response = yield SocialAccount_1.default.find({
        organizationId: post.organizationId,
    });
    if (!response) {
        return;
    }
    const accessToken = response[0].accessToken;
    // 2. Obtener el ID de la cuenta de Instagram
    const instagramId = post.instagramAccountId;
    // 3. Subir la imagen al contenedor
    /**
     Campos Posibles: image_url, video_url, caption, location_id, user_tags,
     thumb_offset, media_type, children, share_to_feed, collaborators
     */
    const body = {
        image_url: post.mediaUrls[0],
        caption: post.content,
        access_token: accessToken,
    };
    const response2 = yield axios_1.default.post(`https://graph.facebook.com/v22.0/${instagramId}/media`, body);
    if (response2.status !== 200) {
        console.log("Error al subir la imagen:", response2.data);
        return;
    }
    // 4. Publicar el contenedor
    const creationId = response2.data.id;
    const response3 = yield axios_1.default.post(`https://graph.facebook.com/v22.0/${instagramId}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
    });
    if (response3.status !== 200) {
        console.log("Error al publicar el contenedor:", response3.data);
        return;
    }
});
exports.postToInstagram = postToInstagram;
