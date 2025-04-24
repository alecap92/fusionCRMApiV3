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
exports.deletePushToken = exports.createPushToken = void 0;
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const createPushToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const headers = req.headers;
        console.log("Headers:", headers);
        console.log("Body:", req.body);
        const { token } = req.body;
        const user = req.user;
        console.log(user, token);
        if (!user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!token) {
            return res.status(400).json({ error: "Push token is required" });
        }
        // Buscar al usuario en la base de datos
        const userRecord = yield UserModel_1.default.findById(user._id);
        if (!userRecord) {
            return res.status(404).json({ error: "User not found" });
        }
        // Si el token ya existe, no lo agregamos
        if (userRecord.pushToken.includes(token)) {
            return res.status(200).json({ message: "Push token already exists" });
        }
        console.log("userRecord", userRecord);
        // Agregar el nuevo token
        userRecord.pushToken.push(token);
        yield userRecord.save();
        console.log("Push token saved:", token);
        return res.status(200).json({ message: "Push token saved successfully" });
    }
    catch (error) {
        console.error("Error saving push token:", error);
        return res.status(500).json({ error: "An unexpected error occurred while saving the push token" });
    }
});
exports.createPushToken = createPushToken;
const deletePushToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.body.token;
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        yield UserModel_1.default.updateOne({ _id: user._id }, { $set: { pushToken: null } });
        return res.status(200).json({ message: "Push token deleted" });
    }
    catch (error) {
        console.log(error);
    }
});
exports.deletePushToken = deletePushToken;
