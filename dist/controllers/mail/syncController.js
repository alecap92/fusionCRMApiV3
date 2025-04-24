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
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOldMails = void 0;
const imapClient_1 = require("../../utils/imapClient");
/**
 * Controlador para sincronizar correos antiguos desde el servidor IMAP
 */
const syncOldMails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return res.status(401).json({ error: "User ID is required." });
    }
    try {
        console.log("syncOldMails");
        // Llama a la función utilitaria para sincronizar correos antiguos
        const syncedEmails = yield (0, imapClient_1.syncOldEmails)(userId);
        if (syncedEmails.length === 0) {
            return res.status(200).json({ message: "No old emails found." });
        }
        res.status(200).json({
            message: "Old emails fetched and saved to the database.",
            syncedEmails,
        });
    }
    catch (error) {
        console.error("Error syncing old emails:", error);
        res.status(500).json({ error: "Failed to sync old emails." });
    }
});
exports.syncOldMails = syncOldMails;
