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
exports.getInstagramAccounts = exports.getMe = exports.callbackSocialAccount = exports.deleteSocialAccount = exports.updateSocialAccount = exports.createSocialAccount = exports.getSocialAccount = exports.getSocialAccounts = void 0;
const SocialAccount_1 = __importDefault(require("../../models/SocialAccount"));
const axios_1 = __importDefault(require("axios"));
const getSocialAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationId } = req.query;
        const filter = organizationId ? { organizationId } : {};
        const accounts = yield SocialAccount_1.default.find(filter);
        res.status(200).json(accounts);
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Error al obtener cuentas sociales", error: err });
    }
});
exports.getSocialAccounts = getSocialAccounts;
const getSocialAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const account = yield SocialAccount_1.default.findById(req.params.id);
        if (!account)
            return res.status(404).json({ message: "Cuenta no encontrada" });
        res.status(200).json(account);
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Error al obtener cuenta social", error: err });
    }
});
exports.getSocialAccount = getSocialAccount;
const createSocialAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newAccount = new SocialAccount_1.default(req.body);
        const saved = yield newAccount.save();
        res.status(201).json(saved);
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Error al crear cuenta social", error: err });
    }
});
exports.createSocialAccount = createSocialAccount;
const updateSocialAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield SocialAccount_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ message: "Cuenta no encontrada" });
        res.status(200).json(updated);
    }
    catch (err) {
        res.status(400).json({ message: "Error al actualizar cuenta", error: err });
    }
});
exports.updateSocialAccount = updateSocialAccount;
const deleteSocialAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield SocialAccount_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ message: "Cuenta no encontrada" });
        res.status(200).json({ message: "Cuenta eliminada" });
    }
    catch (err) {
        res.status(500).json({ message: "Error al eliminar cuenta", error: err });
    }
});
exports.deleteSocialAccount = deleteSocialAccount;
const callbackSocialAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { code, state } = req.query;
    const organizationId = state;
    console.log("state de autorización:", state);
    if (!code) {
        return res.status(400).json({ message: "Falta el código de autorización" });
    }
    try {
        // Paso 1: Obtener access_token corto
        const { data: tokenResponse } = yield axios_1.default.get("https://graph.facebook.com/v22.0/oauth/access_token", {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code,
            },
        });
        const shortToken = tokenResponse.access_token;
        if (!shortToken) {
            return res
                .status(400)
                .json({ message: "No se pudo obtener el token de acceso." });
        }
        // Paso 2: Intercambiar por token de larga duración
        const { data: longTokenResponse } = yield axios_1.default.get("https://graph.facebook.com/v22.0/oauth/access_token", {
            params: {
                grant_type: "fb_exchange_token",
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                fb_exchange_token: shortToken,
            },
        });
        const { access_token: longLivedToken, expires_in } = longTokenResponse;
        // Paso 3: Obtener información del usuario
        const { data: userInfo } = yield axios_1.default.get("https://graph.facebook.com/me", {
            params: {
                access_token: longLivedToken,
                fields: "id,name,email,picture",
            },
        });
        // Paso 4: Guardar en la base de datos
        yield SocialAccount_1.default.findOneAndUpdate({
            platform: "facebook",
            organizationId,
            accountId: userInfo.id, // clave para identificar la cuenta
        }, {
            accessToken: longLivedToken,
            expiresIn: expires_in,
            username: userInfo.name,
            picture: userInfo.picture.data.url,
        }, {
            upsert: true, // crea si no existe
            new: true, // devuelve el documento actualizado
            setDefaultsOnInsert: true,
        });
        return res.status(200).json({
            message: "Cuenta social de Facebook conectada con éxito",
            expires_in,
        });
    }
    catch (err) {
        console.error("Error al conectar cuenta social:", ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
        return res
            .status(500)
            .json({ message: "Ocurrió un error al conectar con Facebook" });
    }
});
exports.callbackSocialAccount = callbackSocialAccount;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    const account = yield SocialAccount_1.default.findOne({
        organizationId,
        platform: "facebook",
    });
    if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
    }
    const accessToken = account.accessToken;
    if (!accessToken) {
        return res.status(400).json({ message: "Falta el access token" });
    }
    try {
        const { data: userInfo } = yield axios_1.default.get("https://graph.facebook.com/me", {
            params: {
                access_token: accessToken,
                fields: "id,name,email,picture",
            },
        });
        return res.status(200).json({
            message: "Información del usuario obtenida con éxito",
            userInfo,
        });
    }
    catch (err) {
        console.error("Error al obtener información del usuario:", err);
        return res.status(500).json({
            message: "Ocurrió un error al obtener la información del usuario",
        });
    }
});
exports.getMe = getMe;
const getInstagramAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    const account = yield SocialAccount_1.default.findOne({
        organizationId,
        platform: "facebook",
    });
    if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
    }
    const accessToken = account.accessToken;
    if (!accessToken) {
        return res.status(400).json({ message: "Falta el access token" });
    }
    try {
        const { data: userInfo } = yield axios_1.default.get("https://graph.facebook.com/me/accounts", {
            params: {
                access_token: accessToken,
                fields: "id,name,instagram_business_account,access_token",
            },
        });
        return res.status(200).json(userInfo);
    }
    catch (err) {
        console.error("Error al obtener cuentas de Instagram:", err);
        return res.status(500).json({
            message: "Ocurrió un error al obtener las cuentas de Instagram",
        });
    }
});
exports.getInstagramAccounts = getInstagramAccounts;
