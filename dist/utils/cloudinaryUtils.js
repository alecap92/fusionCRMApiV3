"use strict";
// utils/cloudinaryUtils.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMediaFromCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const deleteMediaFromCloudinary = (mediaIds) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(mediaIds, "mediaIds");
    try {
        yield Promise.all(mediaIds.map((mediaId) => __awaiter(void 0, void 0, void 0, function* () {
            yield cloudinary_1.v2.uploader.destroy(mediaId);
        })));
    }
    catch (error) {
        console.error("Error al eliminar media de Cloudinary:", error);
        throw error;
    }
});
exports.deleteMediaFromCloudinary = deleteMediaFromCloudinary;
