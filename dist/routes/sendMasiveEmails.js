"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sendMasiveEmailController_1 = require("../controllers/sendMasiveEmails/sendMasiveEmailController");
const router = (0, express_1.Router)();
/**
 * @route POST /api/email/send
 * @desc Enviar una campaña de correos electrónicos
 * @access Private
 */
router.post("/send/:campaignId", sendMasiveEmailController_1.sendEmailCampaign);
exports.default = router;
