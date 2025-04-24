"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhook = void 0;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const verifyWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        }
        else {
            res.status(403).json({ error: "Forbidden" });
        }
    }
    else {
        res.status(400).json({ error: "Bad Request" });
    }
};
exports.verifyWebhook = verifyWebhook;
