import { Request, Response } from "express";
import CampanaModel from "../../models/CampanaModel";

// Helper to send uniform error response
const handleError = (
  res: Response,
  error: any,
  message: string = "Server error"
) => {
  return res.status(500).json({ message, error: error.message || error });
};

export const getCampanas = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    return res.status(400).json({ message: "organizationId is required" });
  }

  try {
    const campanas = await CampanaModel.find({ organizationId });
    if (!campanas.length) {
      return res.status(404).json({ message: "No campaigns found" });
    }
    res.status(200).json(campanas);
  } catch (error) {
    handleError(res, error);
  }
};

export const getCampana = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organizationId } = req.body;

  if (!id || !organizationId) {
    return res
      .status(400)
      .json({ message: "id and organizationId are required" });
  }

  try {
    const campana = await CampanaModel.findOne({ _id: id, organizationId });
    if (!campana) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.status(200).json(campana);
  } catch (error) {
    handleError(res, error);
  }
};

export const updateCampana = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organizationId } = req.body;

  if (!id || !organizationId) {
    return res
      .status(400)
      .json({ message: "id and organizationId are required" });
  }

  try {
    const updatedCampana = await CampanaModel.findOneAndUpdate(
      { _id: id, organizationId },
      req.body,
      { new: true }
    );
    if (!updatedCampana) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.status(200).json(updatedCampana);
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteCampana = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organizationId } = req.body;

  if (!id || !organizationId) {
    return res
      .status(400)
      .json({ message: "id and organizationId are required" });
  }

  try {
    const deletedCampana = await CampanaModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deletedCampana) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
};

export const createCampana = async (req: Request, res: Response) => {
  const campana = req.body;

  console.log(campana);

  const organizationId = req.user?.organizationId;
  const userId = req.user?._id;

  if (!organizationId) {
    return res.status(400).json({ message: "organizationId is required" });
  }

  try {
    const newCampana = new CampanaModel({
      ...campana,
      organizationId,
      createdBy: userId,
    });
    await newCampana.save();
    res.status(201).json(newCampana);
  } catch (error) {
    console.log(error);
    handleError(res, error);
  }
};
