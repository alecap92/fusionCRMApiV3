import { Router } from "express";
import { sendEmailCampaign } from "../controllers/sendMasiveEmails/sendMasiveEmailController";

const router: Router = Router();

/**
 * @route POST /api/email/send
 * @desc Enviar una campaña de correos electrónicos
 * @access Private
 */
router.post("/send/:campaignId", sendEmailCampaign);

export default router;
