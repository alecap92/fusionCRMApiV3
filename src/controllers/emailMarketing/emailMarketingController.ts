import { Request, Response } from "express";
import { ObjectId } from "mongoose";
import EmailMarketingModel from "../../models/EmailMarketingModel";

// ✅ Crear una nueva campaña
export const createCampaign = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const createdBy = req.user?._id;

    const { name, description, emailTemplateId, recipients, scheduledAt } =
      req.body;

    console.log(req.body);

    if (!name || !emailTemplateId || !recipients) {
      return res.status(400).json({
        message: "Name, emailTemplateId, and recipients are required fields.",
      });
    }

    const newCampaign = new EmailMarketingModel({
      name,
      description,
      emailTemplateId,
      recipients,
      scheduledAt,
      organizationId,
      userId: createdBy,
      createdAt: new Date(),
      status: "draft", // Default status is draft
    });

    await newCampaign.save();
    res.status(201).json({
      message: "Campaign created successfully",
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Obtener todas las campañas de la organización con paginación
export const getCampaings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const campaings = await EmailMarketingModel.find({ organizationId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("userId");

    console.log(campaings);

    const total = await EmailMarketingModel.countDocuments({ organizationId });

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      campaings,
    });
  } catch (error) {
    console.error("Error fetching campaings:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Obtener una campaña por ID
export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const campaign = await EmailMarketingModel.findOne({
      _id: id,
      organizationId,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    res.status(200).json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Actualizar una campaña
export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const {
      name,
      description,
      emailTemplateId,
      recipients,
      scheduledAt,
      status,
    } = req.body;

    const existingCampaign = await EmailMarketingModel.findOne({
      _id: id,
      organizationId,
    });

    if (!existingCampaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    existingCampaign.name = name ?? existingCampaign.name;
    existingCampaign.description = description ?? existingCampaign.description;
    existingCampaign.emailTemplateId =
      emailTemplateId ?? existingCampaign.emailTemplateId;
    existingCampaign.recipients = recipients ?? existingCampaign.recipients;
    existingCampaign.scheduledAt = scheduledAt ?? existingCampaign.scheduledAt;
    existingCampaign.status = status ?? existingCampaign.status;

    await existingCampaign.save();

    res.status(200).json({
      message: "Campaign updated successfully",
      campaign: existingCampaign,
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Eliminar una campaña
export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const deletedCampaign = await EmailMarketingModel.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!deletedCampaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
