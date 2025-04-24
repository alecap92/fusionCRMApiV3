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
exports.getMedia = void 0;
const axios_1 = __importDefault(require("axios"));
const apiUrl = process.env.WHATSAPP_API_URL;
const getMedia = (mediaId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${apiUrl}/${mediaId}`;
    try {
        const response = yield axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const media = yield axios_1.default.get(response.data.url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            responseType: "arraybuffer",
        });
        return media.data;
    }
    catch (error) {
        console.error("Error fetching media:");
        throw error;
    }
});
exports.getMedia = getMedia;
