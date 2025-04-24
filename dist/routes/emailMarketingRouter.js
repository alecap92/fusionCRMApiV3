"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailMarketingController_1 = require("../controllers/emailMarketing/emailMarketingController");
const router = (0, express_1.Router)();
router.post("/", emailMarketingController_1.createCampaign); // Create a campaign
router.get("/", emailMarketingController_1.getCampaings); // Get all campaigns
router.get("/:id", emailMarketingController_1.getCampaignById); // Get a campaign by ID
router.put("/:id", emailMarketingController_1.updateCampaign); // Update a campaign by ID
router.delete("/:id", emailMarketingController_1.deleteCampaign); // Delete a campaign by ID
exports.default = router;
