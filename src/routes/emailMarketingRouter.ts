import { Router } from "express";
import {
  createCampaign,
  getCampaings,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from "../controllers/emailMarketing/emailMarketingController";

const router: Router = Router();

router.post("/", createCampaign); // Create a campaign
router.get("/", getCampaings); // Get all campaigns
router.get("/:id", getCampaignById); // Get a campaign by ID
router.put("/:id", updateCampaign); // Update a campaign by ID
router.delete("/:id", deleteCampaign); // Delete a campaign by ID

export default router;
